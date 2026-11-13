import { useEffect, useRef } from "react";

/**
 * Parallax effect using CSS transform based on scroll position.
 * Returns a ref that will be the parallax container.
 */
export function useParallax(depth = 0.3): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let ticking = false;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const scrollPercent =
        (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      const offset = scrollPercent * window.innerHeight * depth;
      el.style.transform = `translateY(${offset}px)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      el.style.transform = "";
    };
  }, [depth]);

  return ref;
}
