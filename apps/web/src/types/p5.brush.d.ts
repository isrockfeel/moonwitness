declare module "p5.brush" {
  import type p5 from "p5";

  export function instance(p: p5): void;
  export function scaleBrushes(scale: number): void;
  export function set(name: string, color: string | number, weight?: number): void;
  export function line(x1: number, y1: number, x2: number, y2: number): void;
}
