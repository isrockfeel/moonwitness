// Minimal sfnt patcher: inject a format-0 `kern` table into an OTF/TTF buffer.
// opentype.js 2.0 parses kern but never writes it, so we splice it in here.
// Original work, (c) 2026 MoonWitness. See LICENSE.txt.

function checksum(bytes, start, length) {
  let sum = 0;
  const end = start + length;
  for (let i = start; i < end; i += 4) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const b3 = bytes[i + 3] ?? 0;
    sum = (sum + (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0)) >>> 0;
  }
  return sum;
}

const pad4 = (n) => (n + 3) & ~3;

function buildKernTable(pairs) {
  const sorted = pairs
    .map(({ left, right, value }) => ({ key: left * 65536 + right, left, right, value }))
    .sort((a, b) => a.key - b.key);
  const n = sorted.length;
  const pow = Math.floor(Math.log2(n));
  const searchRange = 2 * 2 ** pow;
  const subLen = 14 + 6 * n;
  const buf = Buffer.alloc(pad4(4 + subLen));
  let o = 0;
  buf.writeUInt16BE(0, o);
  o += 2; // version
  buf.writeUInt16BE(1, o);
  o += 2; // nTables
  buf.writeUInt16BE(0, o);
  o += 2; // subtable version
  buf.writeUInt16BE(subLen, o);
  o += 2;
  buf.writeUInt16BE(0x0001, o);
  o += 2; // coverage: horizontal, format 0
  buf.writeUInt16BE(n, o);
  o += 2;
  buf.writeUInt16BE(searchRange, o);
  o += 2;
  buf.writeUInt16BE(pow, o);
  o += 2;
  buf.writeUInt16BE(2 * n - searchRange, o);
  o += 2;
  for (const p of sorted) {
    buf.writeUInt16BE(p.left, o);
    o += 2;
    buf.writeUInt16BE(p.right, o);
    o += 2;
    buf.writeInt16BE(p.value, o);
    o += 2;
  }
  return buf;
}

// pairs: [{ left, right, value }] with glyph indices. Returns a new Buffer.
export function injectKern(input, pairs) {
  if (!pairs.length) return Buffer.from(input);
  const src = Buffer.from(input);
  const numTables = src.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = src.toString("ascii", rec, rec + 4);
    const offset = src.readUInt32BE(rec + 8);
    const length = src.readUInt32BE(rec + 12);
    if (tag === "kern") continue;
    tables.push({ tag, data: src.subarray(offset, offset + length) });
  }
  tables.push({ tag: "kern", data: buildKernTable(pairs) });
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  const n = tables.length;
  const pow = Math.floor(Math.log2(n));
  const searchRange = 16 * 2 ** pow;
  const dirSize = 12 + n * 16;
  let cursor = pad4(dirSize);
  for (const t of tables) {
    t.offset = cursor;
    cursor = pad4(cursor + t.data.length);
  }
  const out = Buffer.alloc(cursor);
  src.copy(out, 0, 0, 4); // sfnt version
  out.writeUInt16BE(n, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(pow, 8);
  out.writeUInt16BE(n * 16 - searchRange, 10);

  let headOffset = 0;
  tables.forEach((t, i) => {
    const rec = 12 + i * 16;
    out.write(t.tag, rec, 4, "ascii");
    out.writeUInt32BE(checksum(t.data, 0, t.data.length), rec + 4);
    out.writeUInt32BE(t.offset, rec + 8);
    out.writeUInt32BE(t.data.length, rec + 12);
    t.data.copy(out, t.offset);
    if (t.tag === "head") headOffset = t.offset;
  });

  // head.checkSumAdjustment = 0xB1B0AFBA - whole-font checksum.
  out.writeUInt32BE(0, headOffset + 8);
  const total = checksum(out, 0, out.length);
  out.writeUInt32BE((0xb1b0afba - total) >>> 0, headOffset + 8);
  return out;
}
