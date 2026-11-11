import type p5 from "p5";
import type { P5Context } from "../use-p5";
import { hexToRgb } from "../palette";

export interface AmbientOptions {
  mode: "flow" | "dust";
  density: number;
  speed: number;
  interactive: boolean;
  glow: number;
}

interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  c: number;
  s: number;
  tw: number;
}

/** Lapisan ambient kontinu: partikel neon mengikuti flow-field noise, drift pelan. */
export function ambientSketch(opts: AmbientOptions) {
  return (p: p5, ctx: P5Context) => {
    let parts: Particle[] = [];
    let rgb: Array<[number, number, number]> = [];
    let t = 0;
    let lw = 0;
    let lh = 0;

    const build = () => {
      const area = p.width * p.height;
      const base = opts.mode === "dust" ? area / 6500 : area / 10500;
      const count = Math.max(20, Math.min(150, Math.round(base * opts.density)));
      parts = [];
      for (let i = 0; i < count; i++) {
        const x = p.random(p.width);
        const y = p.random(p.height);
        parts.push({
          x,
          y,
          px: x,
          py: y,
          c: Math.floor(p.random(rgb.length)),
          s: opts.speed * (0.5 + p.random(1)),
          tw: p.random(p.TWO_PI),
        });
      }
    };

    p.setup = () => {
      p.createCanvas(ctx.el.clientWidth, ctx.el.clientHeight);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
      p.frameRate(opts.mode === "dust" ? 24 : 30);
      p.noiseSeed(ctx.seed * 97);
      p.randomSeed(ctx.seed * 131);
      rgb =
        opts.mode === "dust"
          ? [ctx.palette.blue, ctx.palette.pink, ctx.palette.paper].map(hexToRgb)
          : [ctx.palette.pink, ctx.palette.blue, ctx.palette.yellow].map(hexToRgb);
      lw = p.width;
      lh = p.height;
      build();
    };

    p.draw = () => {
      if (p.width !== lw || p.height !== lh) {
        lw = p.width;
        lh = p.height;
        build();
      }
      p.clear();
      p.blendMode(p.ADD);
      t += 0.006 * opts.speed;
      const ox = ctx.pointer.x - 0.5;
      const oy = ctx.pointer.y - 0.5;
      const scale = 0.0016;

      for (const pt of parts) {
        const n = p.noise(pt.x * scale, pt.y * scale, t);
        let ang = n * p.TWO_PI * 2;
        if (opts.interactive) ang += ox * 0.8 + oy * 0.4;
        pt.px = pt.x;
        pt.py = pt.y;

        if (opts.mode === "flow") {
          pt.x += p.cos(ang) * pt.s + ox * 0.6;
          pt.y += p.sin(ang) * pt.s + 0.2 + oy * 0.6;
          if (pt.x < -5) { pt.x = p.width + 5; pt.px = pt.x; }
          if (pt.x > p.width + 5) { pt.x = -5; pt.px = pt.x; }
          if (pt.y < -5) { pt.y = p.height + 5; pt.py = pt.y; }
          if (pt.y > p.height + 5) { pt.y = -5; pt.py = pt.y; }
        } else {
          pt.x += p.cos(ang) * pt.s * 0.3 + ox * 0.3;
          pt.y += p.sin(ang) * pt.s * 0.3 + oy * 0.3;
          if (pt.x < 0) pt.x = p.width;
          if (pt.x > p.width) pt.x = 0;
          if (pt.y < 0) pt.y = p.height;
          if (pt.y > p.height) pt.y = 0;
          pt.tw += 0.03;
        }

        const col = rgb[pt.c] ?? rgb[0] ?? [255, 45, 120];
        const tw = opts.mode === "dust" ? 0.4 + 0.6 * Math.abs(Math.sin(pt.tw)) : 1;
        const a = opts.glow * tw;
        p.stroke(col[0], col[1], col[2], a * 0.5);
        p.strokeWeight(opts.mode === "dust" ? 1 : 1.4);
        p.line(pt.px, pt.py, pt.x, pt.y);
        p.noStroke();
        p.fill(col[0], col[1], col[2], a);
        p.circle(pt.x, pt.y, opts.mode === "dust" ? 2.2 : 3.2);
        p.fill(col[0], col[1], col[2], a * 0.25);
        p.circle(pt.x, pt.y, opts.mode === "dust" ? 5 : 8);
      }
      p.blendMode(p.BLEND);
    };
  };
}