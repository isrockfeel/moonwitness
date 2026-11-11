import type p5 from "p5";
import type { P5Context } from "../use-p5";
import { hexToRgb } from "../palette";

type Brush = {
  instance: (p: p5) => void;
  scaleBrushes: (scale: number) => void;
  set: (type: string, color: string, weight: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
};

/**
 * Komposisi natural-media SEKALI render (bukan per-frame): halo spray + sweep
 * charcoal + aksen marker di belakang wordmark. p5.brush 3.x wajib canvas WEBGL
 * dengan origin di tengah, dan diekspor sebagai named exports (bukan default).
 * Di-dynamic-import saat setup (client-only); kalau gagal, fallback spray plain-p5.
 */
export function brushSketch(opts: { seed: number }) {
  return (p: p5, ctx: P5Context) => {
    let brush: Brush | null = null;

    p.setup = async () => {
      try {
        brush = await import("p5.brush");
        brush.instance(p);
      } catch {
        brush = null;
      }
      p.createCanvas(ctx.el.clientWidth, ctx.el.clientHeight, p.WEBGL);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
      if (brush) {
        try {
          brush.scaleBrushes(2);
        } catch {
          brush = null;
        }
      }
      p.noLoop();
    };

    p.draw = () => {
      p.clear();
      p.randomSeed(opts.seed * 7919);
      const cx = 0;
      const cy = (0.46 - 0.5) * p.height;
      const rx = Math.min(p.width * 0.42, 520);
      const ry = Math.min(p.height * 0.34, 200);
      if (brush) {
        try {
          compose(brush, cx, cy, rx, ry);
          return;
        } catch {
          brush = null;
        }
      }
      fallback(cx, cy, rx, ry);
    };

    function compose(b: Brush, cx: number, cy: number, rx: number, ry: number) {
      const cols = [ctx.palette.pink, ctx.palette.blue, ctx.palette.yellow];
      const ring = 90;
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * p.TWO_PI;
        const jitter = p.random(-0.12, 0.12);
        const x = cx + p.cos(a) * rx * (1 + jitter);
        const y = cy + p.sin(a) * ry * (1 + jitter);
        const col = cols[i % cols.length] ?? ctx.palette.pink;
        b.set("spray", col, p.random(0.6, 1.6));
        const tx = -p.sin(a) * p.random(6, 20);
        const ty = p.cos(a) * p.random(6, 20);
        b.line(x - tx, y - ty, x + tx, y + ty);
      }
      for (let i = 0; i < 5; i++) {
        const y = cy + p.random(-ry, ry);
        b.set("charcoal", ctx.palette.paper, p.random(0.4, 1));
        b.line(cx - rx * p.random(0.6, 1), y, cx + rx * p.random(0.6, 1), y + p.random(-10, 10));
      }
      for (let i = 0; i < 14; i++) {
        const a = p.random(p.TWO_PI);
        const r = p.random(0.7, 1.05);
        const x = cx + p.cos(a) * rx * r;
        const y = cy + p.sin(a) * ry * r;
        const col = cols[Math.floor(p.random(cols.length))] ?? ctx.palette.yellow;
        b.set("marker", col, p.random(1, 2.4));
        b.line(x, y, x + p.random(-3, 3), y + p.random(-3, 3));
      }
    }

    function fallback(cx: number, cy: number, rx: number, ry: number) {
      p.blendMode(p.ADD);
      const cols = [ctx.palette.pink, ctx.palette.blue, ctx.palette.yellow].map(hexToRgb);
      for (let i = 0; i < 260; i++) {
        const a = p.random(p.TWO_PI);
        const r = p.random(0.6, 1.1);
        const x = cx + p.cos(a) * rx * r;
        const y = cy + p.sin(a) * ry * r;
        const c = cols[Math.floor(p.random(cols.length))] ?? cols[0] ?? [255, 45, 120];
        p.noStroke();
        p.fill(c[0], c[1], c[2], p.random(20, 90));
        p.circle(x, y, p.random(1, 3));
      }
      p.blendMode(p.BLEND);
    }
  };
}
