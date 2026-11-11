import type p5 from "p5";
import type { MapCity } from "@moonwitness/types";
import type { P5Context } from "../use-p5";
import { hexToRgb } from "../palette";

interface Node {
  x: number;
  y: number;
  phase: number;
}
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: number;
}
interface Arc {
  a: number;
  b: number;
  t: number;
  speed: number;
  c: number;
}

/** Jaringan sinyal hidup di atas WorldMap: mote drift, sweep, arc antar kota, pulse node. */
export function signalsSketch(cities: MapCity[], opts: { density: number }) {
  return (p: p5, ctx: P5Context) => {
    let nodes: Node[] = [];
    let motes: Mote[] = [];
    let arcs: Arc[] = [];
    let rgb: Array<[number, number, number]> = [];
    let sweep = 0;
    let lw = 0;
    let lh = 0;

    const layout = () => {
      const W = p.width;
      const H = p.height;
      const s = Math.min(W / 100, H / 80);
      const ox = (W - 100 * s) / 2;
      const oy = (H - 80 * s) / 2;
      nodes = cities.map((c, i) => ({
        x: ox + c.x * s,
        y: oy + c.y * 0.8 * s,
        phase: i * 0.7,
      }));
    };

    const seedMotes = () => {
      const count = Math.max(
        16,
        Math.min(64, Math.round(((p.width * p.height) / 9000) * opts.density)),
      );
      motes = [];
      for (let i = 0; i < count; i++) {
        motes.push({
          x: p.random(p.width),
          y: p.random(p.height),
          vx: (p.random() - 0.5) * 0.4,
          vy: (p.random() - 0.5) * 0.4,
          c: Math.floor(p.random(rgb.length)),
        });
      }
      arcs = [];
      const n = nodes.length;
      for (let i = 0; i < Math.min(6, n); i++) {
        const a = Math.floor(p.random(n));
        let b = Math.floor(p.random(n));
        if (b === a) b = (a + 1) % Math.max(1, n);
        arcs.push({
          a,
          b,
          t: p.random(),
          speed: 0.004 + p.random(0.006),
          c: i % Math.max(1, rgb.length),
        });
      }
    };

    p.setup = () => {
      p.createCanvas(ctx.el.clientWidth, ctx.el.clientHeight);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
      p.frameRate(30);
      p.randomSeed(ctx.seed * 57);
      rgb = [ctx.palette.pink, ctx.palette.blue, ctx.palette.yellow].map(hexToRgb);
      lw = p.width;
      lh = p.height;
      layout();
      seedMotes();
    };

    p.draw = () => {
      if (p.width !== lw || p.height !== lh) {
        lw = p.width;
        lh = p.height;
        layout();
        seedMotes();
      }
      p.clear();
      p.blendMode(p.ADD);

      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < 0) m.x = p.width;
        if (m.x > p.width) m.x = 0;
        if (m.y < 0) m.y = p.height;
        if (m.y > p.height) m.y = 0;
        const col = rgb[m.c] ?? rgb[0] ?? [46, 168, 255];
        p.noStroke();
        p.fill(col[0], col[1], col[2], 40);
        p.circle(m.x, m.y, 2);
      }

      sweep = (sweep + 0.6) % (p.width + 120);
      const sx = sweep - 60;
      const ctx2d = p.drawingContext as CanvasRenderingContext2D;
      const grad = ctx2d.createLinearGradient(sx - 40, 0, sx + 40, 0);
      grad.addColorStop(0, "rgba(46,168,255,0)");
      grad.addColorStop(0.5, "rgba(46,168,255,0.10)");
      grad.addColorStop(1, "rgba(46,168,255,0)");
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(sx - 40, 0, 80, p.height);

      for (const ar of arcs) {
        ar.t += ar.speed;
        if (ar.t > 1) ar.t = 0;
        const A = nodes[ar.a];
        const B = nodes[ar.b];
        if (!A || !B) continue;
        const x = p.lerp(A.x, B.x, ar.t);
        const y = p.lerp(A.y, B.y, ar.t);
        const col = rgb[ar.c] ?? rgb[0] ?? [255, 210, 31];
        p.stroke(col[0], col[1], col[2], 28);
        p.strokeWeight(0.6);
        p.line(A.x, A.y, B.x, B.y);
        p.noStroke();
        p.fill(col[0], col[1], col[2], 180);
        p.circle(x, y, 3);
        p.fill(col[0], col[1], col[2], 50);
        p.circle(x, y, 7);
      }

      const tt = p.millis() * 0.001;
      const pulse = rgb[0] ?? [255, 45, 120];
      for (const nd of nodes) {
        const ph = (tt * 0.6 + nd.phase) % 1;
        const r = 2 + ph * 16;
        const a = (1 - ph) * 120;
        p.noFill();
        p.stroke(pulse[0], pulse[1], pulse[2], a);
        p.strokeWeight(1);
        p.circle(nd.x, nd.y, r * 2);
        p.noStroke();
        p.fill(255, 210, 31, 90);
        p.circle(nd.x, nd.y, 2.5);
      }
      p.blendMode(p.BLEND);
    };
  };
}
