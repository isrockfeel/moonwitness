import type p5 from "p5";
import type { P5Context } from "../use-p5";

export interface MangaLinesOptions {
  speed?: number;
  density?: number;
}

/**
 * P5 Motion Sketch: Manga Action Speedlines & Inverted Halftone Distortion
 * Efek dinamis garis kecepatan manga yang merespons posisi mouse & berkedip sinematik
 */
export function mangaMotionSketch(opts: MangaLinesOptions = {}) {
  const { speed = 1.8, density = 40 } = opts;

  return (p: p5, ctx: P5Context) => {
    let lines: { angle: number; speed: number; len: number; w: number }[] = [];

    p.setup = () => {
      p.createCanvas(ctx.el.clientWidth, ctx.el.clientHeight);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
      p.strokeCap(p.PROJECT);

      // Generate random speed lines
      lines = [];
      for (let i = 0; i < density; i++) {
        lines.push({
          angle: (i / density) * p.TWO_PI,
          speed: p.random(0.8, 2.5) * speed,
          len: p.random(150, 450),
          w: p.random(1, 3.5),
        });
      }
    };

    p.draw = () => {
      p.clear();

      // Titik fokus kecepatan (mengikuti pointer mouse jika ada atau default di tengah-atas)
      const targetX = ctx.pointer.x > 0 ? ctx.pointer.x : p.width * 0.65;
      const targetY = ctx.pointer.y > 0 ? ctx.pointer.y : p.height * 0.35;

      p.stroke(255, 255, 255, 70);

      // Render radial action lines
      for (const line of lines) {
        const offset = (p.frameCount * line.speed * 4) % 180;
        const r1 = 80 + offset;
        const r2 = r1 + line.len;

        const x1 = targetX + p.cos(line.angle) * r1;
        const y1 = targetY + p.sin(line.angle) * r1;
        const x2 = targetX + p.cos(line.angle) * r2;
        const y2 = targetY + p.sin(line.angle) * r2;

        p.strokeWeight(line.w);
        p.line(x1, y1, x2, y2);
      }
    };
  };
}

