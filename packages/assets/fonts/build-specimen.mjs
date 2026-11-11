// Generates a self-contained specimen.html for the Saksi family.
// Fonts are embedded as base64 so the page opens straight from disk.
// Run: node fonts/build-specimen.mjs

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GLYPHS, KERN_PAIRS } from "./skeletons.mjs";

const HERE = import.meta.dirname;
const FONT_DIR = path.resolve(HERE, "../../../apps/web/public/fonts");

const VOICES = [
  { key: "marker", family: "Saksi Marker" },
  { key: "hand", family: "Saksi Hand" },
  { key: "mono", family: "Saksi Mono" },
];

const faces = [];
const fileRows = [];
let totalKb = 0;
for (const v of VOICES) {
  for (const w of [400, 700]) {
    const name = `saksi-${v.key}-${w}.woff2`;
    const buf = readFileSync(path.join(FONT_DIR, name));
    totalKb += buf.length / 1024;
    faces.push(
      `@font-face{font-family:"${v.family}";src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2");font-weight:${w};font-style:normal;font-display:block;}`,
    );
    fileRows.push({ name, kb: (buf.length / 1024).toFixed(1) });
  }
}

const esc = (c) =>
  c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");

const keys = Object.keys(GLYPHS).filter((k) => k !== " ");
const inSet = (set) => keys.filter((k) => set.includes(k));
const CATEGORIES = [
  ["Huruf besar", keys.filter((k) => /^[A-Z]$/.test(k))],
  ["Huruf kecil", keys.filter((k) => /^[a-z]$/.test(k))],
  ["Angka", keys.filter((k) => /^[0-9]$/.test(k))],
  ["Tanda & simbol dasar", inSet(".,:;!?'\"()[]{}/\\-_+=*&@#$%<>~^`|")],
  ["Tipografi & matematika", inSet("§°·×÷©®™–—‘’“”…‹›")],
  ["Panah & status", inSet("←↑→↓↗↘●✓✕")],
  ["Aksen Latin", keys.filter((k) => /[À-ÿ]/.test(k))],
];

function charsetHtml(family) {
  return CATEGORIES.map(([label, chars]) => {
    const cells = chars
      .map(
        (c) =>
          `<button type="button" class="cell" data-char="${esc(c)}" title="U+${hex(c)} — klik untuk uji di preview"><span class="cell-glyph" style="font-family:'${family}'">${esc(c)}</span><span class="cell-hex">${hex(c)}</span></button>`,
      )
      .join("");
    return `<div class="charset-group"><h4>${label} <span>· ${chars.length}</span></h4><div class="grid">${cells}</div></div>`;
  }).join("");
}

const ramp = (family, lines) =>
  lines
    .map(
      ([px, weight, text]) =>
        `<div class="ramp-line"><span class="ramp-size">${px}px / ${weight}</span><span class="ramp-text" style="font-family:'${family}';font-size:${px}px;font-weight:${weight}">${esc(text)}</span></div>`,
    )
    .join("");

const markerRamp = ramp("Saksi Marker", [
  [92, 700, "SAKSI BULAN"],
  [44, 700, "People. Places. Stories."],
  [28, 400, "Another side of reality."],
  [18, 400, "Different people. Same moon. Bigger perspectives."],
  [13, 700, "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789"],
]);
const handRamp = ramp("Saksi Hand", [
  [56, 700, "bulan jadi saksi,"],
  [32, 400, "cerita ditulis tangan di halte jam 23:40"],
  [22, 700, "The quick brown fox jumps over the lazy dog."],
  [16, 400, "Different people. Same moon. Bigger perspectives. 0123456789"],
]);
const monoRamp = ramp("Saksi Mono", [
  [44, 700, "0O 1lI | {} [] ()"],
  [28, 400, "Saksi Mono — data & antarmuka"],
  [18, 400, "LAT -6.2088 LON 106.8456 · 23:40:12 WIB"],
  [13, 400, "the quick brown fox jumps over the lazy dog 0123456789"],
]);

const fileRowsHtml = fileRows
  .map((f) => `<tr><td>${f.name}</td><td>${f.kb} KB</td><td>WOFF2</td></tr>`)
  .join("");

const html = `<!DOCTYPE html>
<html lang="id" data-theme="ink">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='%23f4eede'/%3E%3Ccircle cx='21' cy='13' r='11' fill='%230b0b10'/%3E%3C/svg%3E">
<title>Saksi — Specimen · MoonWitness Type Foundry</title>
<style>
${faces.join("\n")}
:root{
  --ink:#0b0b10; --paper:#f4eede;
  --pink:#ff2d78; --blue:#2ea8ff; --yellow:#ffd21f; --purple:#a855f7; --green:#3ddc84; --red:#ff3b3b;
  --bg:var(--ink); --fg:var(--paper); --panel:#14141c; --panel2:#1b1b26; --line:#2a2a38; --muted:#8f8fa6;
  --font-marker:"Saksi Marker",cursive; --font-hand:"Saksi Hand",cursive; --font-mono:"Saksi Mono",ui-monospace,monospace;
}
[data-theme="paper"]{
  --bg:var(--paper); --fg:var(--ink); --panel:#fffdf6; --panel2:#ece4cf; --line:#d6cdb4; --muted:#6f6852;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scrollbar-color:var(--line) var(--bg)}
body{
  background:var(--bg); color:var(--fg);
  font-family:var(--font-mono); font-size:15px; line-height:1.55;
  transition:background .35s ease,color .35s ease;
}
body::before{
  content:""; position:fixed; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(900px 520px at 88% -12%, rgba(255,45,120,.16), transparent 62%),
    radial-gradient(820px 540px at -8% 28%, rgba(46,168,255,.11), transparent 60%),
    radial-gradient(700px 420px at 55% 118%, rgba(168,85,247,.10), transparent 62%);
}
[data-theme="paper"] body::before{opacity:.55}
::-webkit-scrollbar{width:12px;height:12px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--line);border:3px solid var(--bg);border-radius:8px}
::-webkit-scrollbar-thumb:hover{background:var(--pink)}
::selection{background:var(--pink);color:var(--ink)}
:focus-visible{outline:2px dashed var(--pink);outline-offset:3px}
.wrap{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:0 28px}
button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
input{font:inherit;color:inherit}

/* ---------- masthead ---------- */
.masthead{padding:72px 0 40px;position:relative}
.eyebrow{font-size:12px;letter-spacing:.22em;color:var(--yellow);text-transform:uppercase}
.eyebrow span{color:var(--muted)}
.wordmark{
  font-family:var(--font-marker);font-weight:700;
  font-size:clamp(96px,17vw,216px);line-height:.95;letter-spacing:.02em;
  transform:rotate(-1.4deg);margin:18px 0 10px;
  text-shadow:6px 6px 0 var(--pink),13px 13px 0 rgba(46,168,255,.35);
  animation:stamp .55s cubic-bezier(.2,1.4,.4,1) both;
}
@keyframes stamp{from{opacity:0;transform:rotate(-1.4deg) scale(1.08)}to{opacity:1;transform:rotate(-1.4deg) scale(1)}}
.tagline{font-family:var(--font-hand);font-size:clamp(26px,3.4vw,36px);transform:rotate(-.6deg)}
.tagline mark{
  background:var(--yellow);color:var(--ink);padding:0 10px;
  box-decoration-break:clone;-webkit-box-decoration-break:clone;
}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.chips li{
  font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  border:1.5px dashed var(--line);padding:7px 12px;border-radius:4px;background:var(--panel);
}
.chips li:nth-child(odd){transform:rotate(-.8deg)}
.chips li:nth-child(even){transform:rotate(.7deg)}
.chips li.hot{border-color:var(--pink);color:var(--pink)}
.moons{display:flex;gap:14px;margin-top:30px}
.moons i{width:18px;height:18px;border-radius:50%;border:2px solid var(--fg);display:block}
.moons i:nth-child(1){background:var(--fg)}
.moons i:nth-child(2){background:linear-gradient(90deg,var(--fg) 50%,transparent 50%)}
.moons i:nth-child(3){background:transparent}
.moons i:nth-child(4){background:linear-gradient(270deg,var(--fg) 50%,transparent 50%)}
.moons i:nth-child(5){background:var(--fg)}

/* ---------- control deck ---------- */
.deck{
  position:sticky;top:0;z-index:50;background:var(--panel);
  border-top:2px solid var(--line);border-bottom:2px dashed var(--line);
  padding:16px 0 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);
}
[data-theme="paper"] .deck{box-shadow:0 10px 24px rgba(11,11,16,.12)}
.deck .wrap{display:flex;flex-direction:column;gap:12px}
.deck-row{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:flex-end}
.field{display:flex;flex-direction:column;gap:6px;min-width:0}
.field>span{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;gap:10px}
.field>span output{color:var(--yellow);letter-spacing:.06em}
.field.grow{flex:1 1 260px}
.field input[type="text"]{
  background:var(--panel2);border:1.5px solid var(--line);border-radius:6px;
  padding:9px 12px;color:var(--fg);width:100%;
}
.field input[type="text"]:focus{border-color:var(--pink);outline:none}
.seg{display:flex;border:1.5px solid var(--line);border-radius:6px;overflow:hidden}
.seg button{
  padding:8px 14px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;
  background:var(--panel2);color:var(--muted);border-right:1.5px solid var(--line);
}
.seg button:last-child{border-right:none}
.seg button[aria-pressed="true"]{background:var(--pink);color:var(--ink);font-weight:700}
.seg.blue button[aria-pressed="true"]{background:var(--blue)}
input[type="range"]{
  -webkit-appearance:none;appearance:none;width:170px;height:22px;background:transparent;cursor:pointer;
}
input[type="range"]::-webkit-slider-runnable-track{height:4px;background:var(--line);border-radius:2px}
input[type="range"]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:15px;height:15px;margin-top:-5.5px;
  background:var(--pink);border:2px solid var(--bg);border-radius:4px;transform:rotate(45deg);
}
input[type="range"]::-moz-range-track{height:4px;background:var(--line);border-radius:2px}
input[type="range"]::-moz-range-thumb{
  width:13px;height:13px;background:var(--pink);border:2px solid var(--bg);border-radius:4px;transform:rotate(45deg);
}
.check{display:flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-bottom:6px}
.check input{width:16px;height:16px;accent-color:var(--pink)}
.btn{
  border:1.5px solid var(--line);border-radius:6px;padding:8px 14px;font-size:12px;
  letter-spacing:.1em;text-transform:uppercase;background:var(--panel2);
}
.btn:hover{border-color:var(--yellow);color:var(--yellow)}
.presets{display:flex;flex-wrap:wrap;gap:8px}
.presets button{
  font-size:11px;color:var(--muted);border:1px dashed var(--line);border-radius:999px;padding:4px 12px;
}
.presets button:hover{color:var(--blue);border-color:var(--blue)}

/* ---------- live stage ---------- */
.stage{padding:44px 0 10px}
.stage-head{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.sticker{
  font-family:var(--font-marker);font-size:15px;background:var(--yellow);color:var(--ink);
  padding:4px 14px;transform:rotate(-2deg);border-radius:3px;box-shadow:3px 3px 0 rgba(0,0,0,.3);
}
.caption{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.preview{
  position:relative;background:var(--panel);border:2px dashed var(--line);border-radius:10px;
  min-height:230px;display:flex;align-items:center;padding:38px 42px;
  overflow-wrap:anywhere;line-height:1.12;font-synthesis:none;
}
.preview::before,.preview::after{
  content:"";position:absolute;width:92px;height:26px;background:rgba(255,210,31,.75);
  top:-13px;transform:rotate(-4deg);border-radius:2px;
}
.preview::before{left:8%}
.preview::after{right:8%;transform:rotate(3deg)}

/* ---------- voice sections ---------- */
.voice{padding:64px 0 30px;border-top:2px dashed var(--line);margin-top:52px}
.voice-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 20px;margin-bottom:8px}
.voice-head h2{font-size:clamp(40px,6vw,64px);line-height:1.05;font-synthesis:none}
.badge{
  font-size:10px;letter-spacing:.2em;text-transform:uppercase;border-radius:4px;padding:5px 10px;
  background:var(--pink);color:var(--ink);font-weight:700;transform:rotate(-1.5deg);
}
.badge.blue{background:var(--blue)}
.badge.yellow{background:var(--yellow)}
.role{width:100%;color:var(--muted);font-size:13px;max-width:640px}
.ramp{margin:26px 0 8px;display:flex;flex-direction:column;gap:14px}
.ramp-line{display:flex;align-items:baseline;gap:18px;border-bottom:1px solid var(--line);padding-bottom:12px}
.ramp-size{flex:0 0 86px;font-size:10px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}
.ramp-text{line-height:1.12;font-synthesis:none;overflow-wrap:anywhere}
.cols{display:grid;grid-template-columns:1.2fr 1fr;gap:26px;margin:30px 0}
@media (max-width:860px){.cols{grid-template-columns:1fr}}
.para{background:var(--panel);border:1.5px solid var(--line);border-radius:10px;padding:26px 28px}
.para h3,.mock h3,.charset h3{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--yellow);margin-bottom:14px}
.para p{font-size:19px;line-height:1.6;font-synthesis:none}
.para p+p{margin-top:14px}
.para .w700{font-weight:700}
.para .note{font-size:12px;color:var(--muted);margin-top:16px}
.mock{background:var(--panel);border:1.5px solid var(--line);border-radius:10px;padding:26px 28px;position:relative;overflow:hidden}

/* marker mock: poster */
.poster{background:var(--panel2);border:2px solid var(--fg);border-radius:8px;padding:26px;transform:rotate(-.6deg);position:relative}
.poster h5{font-family:var(--font-marker);font-weight:700;font-size:30px;line-height:1.1;text-shadow:3px 3px 0 var(--pink)}
.poster .btn-zine{
  display:inline-block;margin-top:18px;font-family:var(--font-marker);font-size:17px;
  background:var(--pink);color:var(--ink);padding:9px 20px;border-radius:6px;
  border:2px solid var(--ink);box-shadow:4px 4px 0 var(--blue);transform:rotate(-1deg);
}
.poster .stiker{
  position:absolute;top:-14px;right:-10px;font-family:var(--font-marker);font-size:13px;
  background:var(--yellow);color:var(--ink);padding:5px 12px;border-radius:50%;
  transform:rotate(8deg);border:2px solid var(--ink);
}
.kern-demo{margin-top:22px}
.kern-demo .kern-line{font-family:var(--font-marker);font-size:38px;font-weight:700;line-height:1.2}
.kern-demo p{font-size:11px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-top:6px}

/* hand mock: story card */
.story-card{background:var(--panel2);border:1.5px solid var(--line);border-radius:8px;padding:22px;position:relative}
.story-card .meta{font-size:11px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
.story-card .body{font-family:var(--font-hand);font-size:25px;line-height:1.35;margin-top:10px}
.margin-note{
  font-family:var(--font-hand);font-size:21px;color:var(--blue);margin-top:16px;
  transform:rotate(-1.6deg);display:block;
}
.margin-note b{color:var(--pink);font-weight:400}
.hand-underline{border-bottom:2px dashed var(--pink);padding-bottom:2px}

/* mono mock: command center */
.console{background:var(--ink);color:var(--paper);border:1.5px solid var(--line);border-radius:8px;padding:20px;font-size:13.5px}
[data-theme="paper"] .console{background:#101018}
.console .bar{display:flex;justify-content:space-between;color:var(--yellow);font-size:11px;letter-spacing:.16em;text-transform:uppercase;border-bottom:1px dashed #2a2a38;padding-bottom:10px;margin-bottom:12px}
.console .row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid rgba(42,42,56,.5)}
.console .ok{color:var(--green)} .console .wait{color:var(--yellow)} .console .bad{color:var(--red)}
.console .cursor{display:inline-block;width:9px;height:15px;background:var(--green);vertical-align:-2px;animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.zero-demo{margin-top:16px;font-size:13px;color:var(--muted)}
.zero-demo b{font-family:var(--font-mono);font-weight:700;color:var(--fg);font-size:17px;letter-spacing:.06em}

/* charset */
.charset{margin-top:8px}
.charset-group{margin-bottom:22px}
.charset-group h4{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.charset-group h4 span{color:var(--pink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px}
.cell{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  background:var(--panel);border:1.5px solid var(--line);border-radius:8px;
  min-height:66px;padding:6px 2px;transition:transform .12s ease,border-color .12s ease;
}
.cell:hover{border-color:var(--pink);transform:translateY(-3px);background:var(--panel2)}
.cell-glyph{font-size:27px;line-height:1.15;font-weight:400}
.cell-hex{font-size:8.5px;letter-spacing:.08em;color:var(--muted)}
.metrics{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:18px}
.metrics b{color:var(--blue);font-weight:400}

/* footer */
footer{border-top:2px dashed var(--line);margin-top:64px;padding:48px 0 72px}
.foot-hand{font-family:var(--font-hand);font-size:32px;transform:rotate(-.8deg);margin-bottom:26px}
.foot-hand mark{background:var(--pink);color:var(--ink);padding:0 8px}
.files{border:1.5px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:24px;background:var(--panel)}
.files table{width:100%;border-collapse:collapse;font-size:13px}
.files td{padding:9px 16px;border-bottom:1px solid var(--line)}
.files tr:last-child td{border-bottom:none}
.files td:nth-child(2){color:var(--yellow);width:110px}
.files td:nth-child(3){color:var(--muted);width:90px}
.license{font-size:12.5px;color:var(--muted);max-width:760px}
.license b{color:var(--red);font-weight:400}
.build{margin-top:16px;font-size:12px;color:var(--blue)}

.reveal{opacity:0;transform:translateY(16px)}
.reveal.in{opacity:1;transform:none;transition:opacity .5s ease,transform .5s ease}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .wordmark{animation:none}
  .console .cursor{animation:none}
  .reveal{opacity:1;transform:none;transition:none}
  *{transition:none!important}
}
@media (max-width:640px){
  .wrap{padding:0 16px}
  .masthead{padding-top:44px}
  .preview{padding:26px 20px;min-height:170px}
  .ramp-line{flex-direction:column;gap:4px}
  input[type="range"]{width:130px}
}
</style>
</head>
<body>

<header class="masthead wrap">
  <p class="eyebrow">MoonWitness Type Foundry <span>·</span> rilis 1.000 <span>·</span> 2026</p>
  <h1 class="wordmark">SAKSI</h1>
  <p class="tagline">Font milik kita sendiri — <mark>tiga suara, satu tangan.</mark></p>
  <ul class="chips">
    <li>176 glyph / style</li>
    <li>6 style · 3 suara</li>
    <li>${totalKb.toFixed(0)} KB WOFF2 total</li>
    <li>${Object.keys(KERN_PAIRS).length} pasang kerning</li>
    <li class="hot">Proprietary — bukan OFL</li>
  </ul>
  <div class="moons" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
</header>

<section class="deck" aria-label="Kontrol specimen">
  <div class="wrap">
    <div class="deck-row">
      <label class="field grow"><span>Teks uji</span>
        <input type="text" id="textInput" value="Different people. Same moon." autocomplete="off" spellcheck="false">
      </label>
      <div class="field"><span>Suara</span>
        <div class="seg" id="voiceSeg" role="group" aria-label="Pilih suara">
          <button type="button" data-voice="marker" aria-pressed="true">Marker</button>
          <button type="button" data-voice="hand" aria-pressed="false">Hand</button>
          <button type="button" data-voice="mono" aria-pressed="false">Mono</button>
        </div>
      </div>
      <div class="field"><span>Bobot</span>
        <div class="seg blue" id="weightSeg" role="group" aria-label="Pilih bobot">
          <button type="button" data-weight="400" aria-pressed="false">400</button>
          <button type="button" data-weight="700" aria-pressed="true">700</button>
        </div>
      </div>
      <button type="button" class="btn" id="themeBtn">Mode terang</button>
      <button type="button" class="btn" id="resetBtn">Reset</button>
    </div>
    <div class="deck-row">
      <label class="field"><span>Ukuran <output id="sizeOut">88px</output></span>
        <input type="range" id="sizeRange" min="16" max="160" value="88">
      </label>
      <label class="field"><span>Tracking <output id="trackOut">0.00em</output></span>
        <input type="range" id="trackRange" min="-5" max="30" value="0">
      </label>
      <label class="field"><span>Leading <output id="leadOut">1.12</output></span>
        <input type="range" id="leadRange" min="90" max="180" value="112">
      </label>
      <label class="check"><input type="checkbox" id="kernCheck" checked> Kerning</label>
    </div>
    <div class="presets" aria-label="Teks contoh">
      <button type="button" data-text="Different people. Same moon.">Same moon</button>
      <button type="button" data-text="People. Places. Stories.">Tagline</button>
      <button type="button" data-text="AVATAR WAV Ta P, Yo Te">Kerning</button>
      <button type="button" data-text="The quick brown fox jumps over the lazy dog 0123456789">Pangram</button>
      <button type="button" data-text="MALAM INI, BULAN JADI SAKSI.">Poster</button>
      <button type="button" data-text="LAT -6.2088 LON 106.8456 · 23:40 WIB ✓">Data</button>
      <button type="button" data-text="Hujan baru berhenti — kita menatap langit yang sama.">Catatan</button>
    </div>
  </div>
</section>

<main class="wrap">

  <section class="stage reveal" aria-label="Preview langsung">
    <div class="stage-head">
      <span class="sticker">LIVE PREVIEW</span>
      <span class="caption" id="caption"></span>
    </div>
    <div class="preview" id="preview" aria-live="polite">Different people. Same moon.</div>
  </section>

  <section class="voice reveal" id="marker">
    <header class="voice-head">
      <h2 style="font-family:var(--font-marker);font-weight:700">Saksi Marker</h2>
      <span class="badge">Display</span>
      <p class="role">Suara poster dan judul. Spidol tebal dengan tekanan naik-turun, gigi kertas, dan sedikit goyah — seperti ditulis cepat di dinding zine.</p>
    </header>
    <div class="ramp">${markerRamp}</div>
    <div class="cols">
      <div class="para">
        <h3>Paragraf · 400 &amp; 700</h3>
        <p style="font-family:var(--font-marker)">MoonWitness adalah jaringan cerita global. Orang berbeda, bulan yang sama, sudut pandang yang lebih luas. Setiap cerita punya tempat, setiap tempat punya saksi.</p>
        <p class="w700" style="font-family:var(--font-marker)">KIRIM CERITAMU. MALAM INI JUGA.</p>
        <p class="note">Marker dipakai untuk headline, tombol, dan sticker — bukan untuk teks panjang.</p>
      </div>
      <div class="mock">
        <h3>Dalam antarmuka</h3>
        <div class="poster">
          <span class="stiker">100% ASLI</span>
          <h5>MALAM INI,<br>BULAN JADI SAKSI.</h5>
          <span class="btn-zine">KIRIM CERITA →</span>
        </div>
        <div class="kern-demo">
          <div class="kern-line">AVATAR WAV Ta P, Yo</div>
          <p>${Object.keys(KERN_PAIRS).length} pasangan kerning aktif</p>
        </div>
      </div>
    </div>
    <div class="charset">
      <h3>Peta glyph · klik untuk uji</h3>
      ${charsetHtml("Saksi Marker")}
    </div>
    <p class="metrics">UPM <b>1000</b> · cap <b>700</b> · x-height <b>520</b> · advance proporsional · bobot <b>400/700</b></p>
  </section>

  <section class="voice reveal" id="hand">
    <header class="voice-head">
      <h2 style="font-family:var(--font-hand);font-weight:700">Saksi Hand</h2>
      <span class="badge blue">Catatan</span>
      <p class="role">Suara catatan pinggir. Pena tipis, miring 9°, memantul di baseline — untuk anotasi, tanda tangan, dan cerita yang terasa ditulis tangan.</p>
    </header>
    <div class="ramp">${handRamp}</div>
    <div class="cols">
      <div class="para">
        <h3>Paragraf · 400 &amp; 700</h3>
        <p style="font-family:var(--font-hand)">Aku menulis ini di halte terakhir. Hujan baru berhenti, dan bulan muncul seperti lampu jalan yang lupa dimatikan. Kalau kamu membaca ini di kota lain — kita menatap langit yang sama.</p>
        <p class="w700" style="font-family:var(--font-hand)">— catatan #0417, Jakarta, 23:40</p>
        <p class="note">Hand dipakai untuk anotasi dan kutipan pendek; tetap terbaca di 16px.</p>
      </div>
      <div class="mock">
        <h3>Dalam antarmuka</h3>
        <div class="story-card">
          <p class="meta">STORY #0418 · REYKJAVÍK · 64.1466° N</p>
          <p class="body">The moon followed me home through three streets. I stopped at the blue door and it stopped too.</p>
          <span class="margin-note"><b>↗</b> ditulis di halte, <span class="hand-underline">jam 23:40</span></span>
        </div>
      </div>
    </div>
    <div class="charset">
      <h3>Peta glyph · klik untuk uji</h3>
      ${charsetHtml("Saksi Hand")}
    </div>
    <p class="metrics">UPM <b>1000</b> · miring <b>9°</b> · advance proporsional · bobot <b>400/700</b></p>
  </section>

  <section class="voice reveal" id="mono">
    <header class="voice-head">
      <h2 style="font-family:var(--font-mono);font-weight:700">Saksi Mono</h2>
      <span class="badge yellow">Data</span>
      <p class="role">Suara antarmuka dan data. Lebar tetap 600 unit, ujung kotak, sambungan bevel, nol bergaris — untuk tabel, koordinat, dan command center.</p>
    </header>
    <div class="ramp">${monoRamp}</div>
    <div class="cols">
      <div class="para">
        <h3>Paragraf · 400 &amp; 700</h3>
        <p style="font-family:var(--font-mono)">Setiap cerita masuk sebagai record: koordinat, waktu, saksi. Sistem memeriksa, mengarsipkan, dan menautkan cerita yang menatap bulan yang sama.</p>
        <p class="w700" style="font-family:var(--font-mono)">STATUS: 1284 CERITA · 63 NEGARA · 1 BULAN</p>
        <p class="note">Mono adalah font tubuh aplikasi: tabel, label, metadata, terminal.</p>
      </div>
      <div class="mock">
        <h3>Dalam antarmuka</h3>
        <div class="console">
          <div class="bar"><span>SHADOW COMMAND CENTER</span><span>23:40:12</span></div>
          <div class="row"><span>#0417 · JAKARTA</span><span class="ok">✓ TERVERIFIKASI</span></div>
          <div class="row"><span>#0418 · REYKJAVÍK</span><span class="wait">… MENUNGGU</span></div>
          <div class="row"><span>#0419 · OSAKA</span><span class="bad">✕ DUPLIKAT</span></div>
          <div class="row"><span>LINK #0417 ↔ #0418</span><span class="ok">BULAN SAMA</span></div>
          <div style="margin-top:12px">&gt; scan --phase waxing <span class="cursor"></span></div>
        </div>
        <p class="zero-demo">Nol bergaris &amp; lebar tetap: <b>0O0O 1l1l 600px</b></p>
      </div>
    </div>
    <div class="charset">
      <h3>Peta glyph · klik untuk uji</h3>
      ${charsetHtml("Saksi Mono")}
    </div>
    <p class="metrics">UPM <b>1000</b> · advance tetap <b>600</b> · panose monospace · bobot <b>400/700</b></p>
  </section>

</main>

<footer class="wrap reveal">
  <p class="foot-hand">Dibuat parametrik: <mark>satu kerangka, tiga pena.</mark></p>
  <div class="files">
    <table>
      ${fileRowsHtml}
      <tr><td>masters/*.otf</td><td>6 file</td><td>OTF (CFF)</td></tr>
    </table>
  </div>
  <p class="license"><b>© 2026 MoonWitness.</b> Font proprietary — milik eksklusif MoonWitness. Penggunaan hanya untuk produk dan materi MoonWitness. Dilarang redistribusi, modifikasi, sublicensi, atau penjualan tanpa izin tertulis. Lihat LICENSE.txt.</p>
  <p class="build">Bangun ulang: pnpm --filter @moonwitness/assets fonts</p>
</footer>

<script>
(function () {
  "use strict";
  var families = { marker: '"Saksi Marker"', hand: '"Saksi Hand"', mono: '"Saksi Mono"' };
  var labels = { marker: "Saksi Marker", hand: "Saksi Hand", mono: "Saksi Mono" };
  var defaults = { voice: "marker", weight: 700, size: 88, track: 0, lead: 112, kern: true, text: "Different people. Same moon." };
  var state = Object.assign({}, defaults);

  var preview = document.getElementById("preview");
  var caption = document.getElementById("caption");
  var textInput = document.getElementById("textInput");
  var sizeRange = document.getElementById("sizeRange");
  var trackRange = document.getElementById("trackRange");
  var leadRange = document.getElementById("leadRange");
  var kernCheck = document.getElementById("kernCheck");
  var sizeOut = document.getElementById("sizeOut");
  var trackOut = document.getElementById("trackOut");
  var leadOut = document.getElementById("leadOut");
  var themeBtn = document.getElementById("themeBtn");
  var voiceBtns = document.querySelectorAll("#voiceSeg button");
  var weightBtns = document.querySelectorAll("#weightSeg button");

  function apply() {
    preview.style.fontFamily = families[state.voice];
    preview.style.fontWeight = String(state.weight);
    preview.style.fontSize = state.size + "px";
    preview.style.letterSpacing = (state.track / 100).toFixed(2) + "em";
    preview.style.lineHeight = (state.lead / 100).toFixed(2);
    preview.style.fontKerning = state.kern ? "normal" : "none";
    preview.style.fontFeatureSettings = state.kern ? '"kern" 1' : '"kern" 0';
    preview.textContent = state.text || " ";
    textInput.value = state.text;
    sizeRange.value = String(state.size);
    trackRange.value = String(state.track);
    leadRange.value = String(state.lead);
    kernCheck.checked = state.kern;
    sizeOut.textContent = state.size + "px";
    trackOut.textContent = (state.track / 100).toFixed(2) + "em";
    leadOut.textContent = (state.lead / 100).toFixed(2);
    voiceBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.voice === state.voice)); });
    weightBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.weight) === state.weight)); });
    caption.textContent = labels[state.voice] + " · " + (state.weight === 700 ? "Bold" : "Regular") + " " + state.weight +
      " · " + state.size + "px · tracking " + (state.track / 100).toFixed(2) + "em · leading " + (state.lead / 100).toFixed(2) +
      " · kern " + (state.kern ? "aktif" : "mati");
  }

  textInput.addEventListener("input", function () { state.text = textInput.value; apply(); });
  sizeRange.addEventListener("input", function () { state.size = Number(sizeRange.value); apply(); });
  trackRange.addEventListener("input", function () { state.track = Number(trackRange.value); apply(); });
  leadRange.addEventListener("input", function () { state.lead = Number(leadRange.value); apply(); });
  kernCheck.addEventListener("change", function () { state.kern = kernCheck.checked; apply(); });
  voiceBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.voice = b.dataset.voice; apply(); });
  });
  weightBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.weight = Number(b.dataset.weight); apply(); });
  });
  document.getElementById("resetBtn").addEventListener("click", function () {
    state = Object.assign({}, defaults); apply();
  });
  themeBtn.addEventListener("click", function () {
    var root = document.documentElement;
    var paper = root.dataset.theme === "paper";
    root.dataset.theme = paper ? "ink" : "paper";
    themeBtn.textContent = paper ? "Mode terang" : "Mode gelap";
  });
  document.querySelectorAll(".presets button").forEach(function (b) {
    b.addEventListener("click", function () { state.text = b.dataset.text; apply(); });
  });
  document.addEventListener("click", function (e) {
    var cell = e.target.closest(".cell");
    if (!cell) return;
    state.text = cell.dataset.char;
    apply();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(".stage").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.06 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  apply();
})();
</script>
</body>
</html>
`;

const out = path.join(HERE, "specimen.html");
writeFileSync(out, html);
console.log(
  `[ok] specimen.html ${(html.length / 1024).toFixed(0)} KB (font tertanam base64) -> ${out}`,
);
