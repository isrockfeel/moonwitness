import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import ts from "typescript";
import type p5 from "p5";
import type { P5Context } from "../src/components/atmosphere/use-p5";
import type { brushSketch } from "../src/components/atmosphere/sketches/brush";

function deferred() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve: () => resolve() };
}

async function fixture(outcome: "loaded" | "failed") {
  const calls: string[] = [];
  const record = (name: string) => () => {
    calls.push(name);
  };
  const context = createContext({ window: { devicePixelRatio: 1 } });
  const importStarted = deferred();
  const releaseImport = deferred();
  // Isolate the WebGL dependency, not the sketch or its palette implementation.
  const brushModule = new SyntheticModule(
    ["instance", "scaleBrushes", "set", "line"],
    function () {
      for (const name of ["instance", "scaleBrushes", "set", "line"])
        this.setExport(name, record(`brush.${name}`));
    },
    { context },
  );
  await brushModule.link(() => {
    throw new Error("Unexpected brush dependency");
  });
  await brushModule.evaluate();

  const sourceModule = (relative: string) => {
    const file = new URL(relative, import.meta.url);
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      fileName: file.pathname,
    });
    return new SourceTextModule(outputText, {
      context,
      identifier: file.href,
      importModuleDynamically: async (specifier) => {
        if (specifier !== "p5.brush") throw new Error(`Unexpected import: ${specifier}`);
        importStarted.resolve();
        await releaseImport.promise;
        if (outcome === "failed") throw new Error("Brush chunk failed to load");
        return brushModule;
      },
    });
  };
  const sketchModule = sourceModule("../src/components/atmosphere/sketches/brush.ts");
  await sketchModule.link((specifier) => {
    if (specifier !== "../palette") throw new Error(`Unexpected dependency: ${specifier}`);
    return sourceModule("../src/components/atmosphere/palette.ts");
  });
  await sketchModule.evaluate();
  const { brushSketch: factory } = sketchModule.namespace as { brushSketch: typeof brushSketch };

  const p = {
    width: 800,
    height: 400,
    WEBGL: "webgl",
    TWO_PI: Math.PI * 2,
    ADD: "lighter",
    BLEND: "source-over",
    createCanvas: record("createCanvas"),
    pixelDensity: record("pixelDensity"),
    noLoop: record("noLoop"),
    clear: record("clear"),
    randomSeed: record("randomSeed"),
    blendMode: record("blendMode"),
    noStroke: record("noStroke"),
    fill: record("fill"),
    circle: record("circle"),
    random: (min = 1, max?: number) => {
      calls.push("random");
      return max === undefined ? min / 2 : (min + max) / 2;
    },
    cos: (angle: number) => {
      calls.push("cos");
      return Math.cos(angle);
    },
    sin: (angle: number) => {
      calls.push("sin");
      return Math.sin(angle);
    },
  } as unknown as p5;
  const controller = new AbortController();
  const ctx: P5Context = {
    el: { clientWidth: 800, clientHeight: 400 } as HTMLElement,
    signal: controller.signal,
    palette: {
      pink: "#ff2d78",
      blue: "#2ea8ff",
      yellow: "#ffd21f",
      purple: "#a855f7",
      green: "#3ddc84",
      ink: "#0b0b10",
      paper: "#f4eede",
    },
    pointer: { x: 0.5, y: 0.5 },
    seed: 1,
  };
  factory({ seed: 1 })(p, ctx);
  return { p, controller, calls, importStarted, releaseImport };
}

for (const outcome of ["loaded", "failed"] as const) {
  test(`aborted brush does no late setup or draw work when import ${outcome}`, async () => {
    const { p, controller, calls, importStarted, releaseImport } = await fixture(outcome);
    const setup = p.setup();
    await importStarted.promise;
    expect(calls).toEqual([]);
    // useP5 aborts ctx before removing the instance; p5 2.3.4 still draws after setup.
    controller.abort();
    releaseImport.resolve();
    await setup;
    expect(calls, "late setup must not create a canvas or initialize brushes").toEqual([]);
    p.draw();
    expect(
      calls.length,
      `removed sketch must make no p5 or brush calls (first call: ${calls[0] ?? "none"})`,
    ).toBe(0);
  });

  test(`active brush still creates a canvas and renders when import ${outcome}`, async () => {
    const { p, calls, importStarted, releaseImport } = await fixture(outcome);
    const setup = p.setup();
    await importStarted.promise;
    releaseImport.resolve();
    await setup;
    expect(calls).toContain("createCanvas");
    p.draw();
    expect(calls).toContain("clear");
    expect(calls).toContain(outcome === "loaded" ? "brush.line" : "circle");
  });
}
