import { describe, expect, it } from "vitest";
import {
  avatarDataUri,
  createAvatar,
  PALETTES,
  WITNESS_BACKGROUNDS,
  WITNESS_PALETTES,
} from "./index";

describe("witness avatar", () => {
  it("deterministik untuk seed yang sama", () => {
    const a = createAvatar({ seed: "Zill" }).toString();
    const b = createAvatar({ seed: "Zill" }).toString();
    expect(a).toBe(b);
  });

  it("berbeda untuk seed yang berbeda", () => {
    const a = createAvatar({ seed: "Zill" }).toString();
    const b = createAvatar({ seed: "Mara" }).toString();
    expect(a).not.toBe(b);
  });

  it("menghasilkan SVG valid dengan viewBox 128", () => {
    const svg = createAvatar({ seed: "Kenji" }).toString();
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 128 128"');
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain("<path");
  });

  it("data URI siap dipakai di img", () => {
    const uri = avatarDataUri("Amara");
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(uri.slice("data:image/svg+xml;utf8,".length))).toContain("<svg");
  });

  it("size mengubah width/height", () => {
    const svg = createAvatar({ seed: "Elias", size: 64 }).toString();
    expect(svg).toContain('width="64"');
    expect(svg).toContain('height="64"');
  });

  it("semua palette menghasilkan warna aksen yang benar", () => {
    for (const name of PALETTES) {
      const svg = createAvatar({ seed: "Nadia", palette: name }).toString();
      expect(svg).toContain(WITNESS_PALETTES[name].accent);
    }
  });

  it("background paper memakai kertas krim, transparent tanpa rect latar", () => {
    const paper = createAvatar({ seed: "Ravi", background: "paper" }).toString();
    expect(paper).toContain('<rect width="128" height="128" fill="#f4eede"/>');
    const clear = createAvatar({ seed: "Ravi", background: "transparent" }).toString();
    expect(clear).not.toContain(`fill="${WITNESS_PALETTES.moon.bg}"`);
    expect(clear).not.toContain('<rect width="128" height="128" fill="#f4eede"/>');
  });

  it("halftone bisa dimatikan", () => {
    const on = createAvatar({ seed: "Zill", halftone: true }).toString();
    const off = createAvatar({ seed: "Zill", halftone: false }).toString();
    expect(on).toContain("url(#wHalftone)");
    expect(off).not.toContain("url(#wHalftone)");
  });

  it("crown paksa muncul dan paksa hilang", () => {
    const withCrown = createAvatar({ seed: "Mara", crown: true }).toString();
    const noCrown = createAvatar({ seed: "Mara", crown: false }).toString();
    const crownPath = "M72 30l4-14 8 8 8-8 4 14z";
    expect(withCrown).toContain(crownPath);
    expect(noCrown).not.toContain(crownPath);
  });

  it("moon dan tape bisa dikontrol", () => {
    const svg = createAvatar({ seed: "Kenji", moon: false, tape: true }).toString();
    expect(svg).not.toContain('<circle cx="102" cy="26"');
    expect(svg).toContain("rotate(-6 20 14)");
  });

  it("radius memotong sudut (clip bulat)", () => {
    const svg = createAvatar({ seed: "Amara", radius: 50 }).toString();
    expect(svg).toContain('mask="url(#viewboxMask)"');
  });

  it("banyak seed tidak menghasilkan SVG rusak", () => {
    for (let i = 0; i < 60; i++) {
      const svg = createAvatar({ seed: `witness-${i}` }).toString();
      expect(svg).toContain("</svg>");
      expect(svg).not.toContain("undefined");
      expect(svg).not.toContain("NaN");
    }
  });

  it("daftar background konsisten", () => {
    expect([...WITNESS_BACKGROUNDS]).toEqual(["ink", "paper", "transparent"]);
  });
});
