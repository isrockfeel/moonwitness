import { useEffect, useRef } from "react";

export interface SceneTimelineOptions {
  /** Animation direction — defaults to translateY(-40px) → translateY(0) */
  from?: { opacity?: number; x?: number; y?: number };
  to?: { opacity?: number; x?: number; y?: number };
  /** Easing string or function */
  ease?: string;
  /** Delay before animation starts (seconds) */
  delay?: number;
}

/**
 * Creates a CSS-based animation triggered on scroll into view.
 * Auto-cleans up on unmount. Respects prefers-reduced-motion.
 */
export function useSceneTimeline(options: SceneTimelineOptions = {}) {
  const {
    from = { opacity: 0, y: 40 },
    to = { opacity: 1, y: 0 },
    ease = "cubic-bezier(0.22, 1, 0.36, 1)",
    delay = 0,
  } = options;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    // Set initial state
    el.style.opacity = String(from.opacity ?? 1);
    el.style.transform = `translate(${from.x ?? 0}px, ${from.y ?? 0}px)`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          el.style.transition = `opacity 0.8s ${ease}, transform 0.8s ${ease}`;
          el.style.transitionDelay = `${delay}s`;
          el.style.opacity = String(to.opacity ?? 1);
          el.style.transform = `translate(${to.x ?? 0}px, ${to.y ?? 0}px)`;
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [from, to, ease, delay]);

  return [ref, true] as const;
}
