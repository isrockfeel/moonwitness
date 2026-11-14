import { useEffect, useRef } from "react";
import { useRadioStore } from "../stores/radio";

export function SignalViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signal = useRadioStore((s) => s.signal);
  const wsConnected = useRadioStore((s) => s.wsConnected);
  const health = useRadioStore((s) => s.health);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    // Clear.
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    // Grid.
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center line.
    ctx.strokeStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    if (signal.length > 1) {
      // Draw waveform.
      ctx.strokeStyle = wsConnected ? "#34d399" : "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = w / Math.max(signal.length - 1, 1);
      signal.forEach((point, i) => {
        const x = i * step;
        const y = midY - point.amplitude * (h * 0.4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Glow.
      ctx.strokeStyle = wsConnected ? "rgba(52, 211, 153, 0.3)" : "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 6;
      ctx.stroke();
    } else {
      // No signal — flat line.
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
    }
  }, [signal, wsConnected]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signal</h2>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              wsConnected ? "bg-emerald-400" : "bg-slate-600"
            }`}
          />
          <span className="text-slate-500">{wsConnected ? "live" : "offline"}</span>
          {health.latencyMs !== null && (
            <span className="text-slate-600">{health.latencyMs}ms</span>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="h-32 w-full rounded bg-slate-950"
        style={{ imageRendering: "pixelated" }}
      />
    </section>
  );
}
