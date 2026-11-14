import { useEffect, useRef } from "react";

/** Apply displacement to a decorative child, measuring its untransformed parent. */
export function useParallax(depth = 0.3): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    const cancel = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const update = () => {
      frame = null;
      if (media.matches) {
        el.style.transform = "";
        return;
      }
      const rect = parent.getBoundingClientRect();
      const displacement = (rect.top + rect.height / 2 - window.innerHeight / 2) * depth;
      const offset = Math.max(-80, Math.min(80, displacement));
      el.style.transform = `translateY(${offset}px)`;
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const onPreference = () => {
      cancel();
      update();
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", onPreference);
    update();
    return () => {
      cancel();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", onPreference);
      el.style.transform = "";
    };
  }, [depth]);
  return ref;
}
