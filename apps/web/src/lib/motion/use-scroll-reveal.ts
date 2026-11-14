"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollReveal(
  threshold = 0.15,
  rootMargin = "0px 0px -60px 0px",
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (media.matches) {
        setVisible(true);
        observer.disconnect();
      }
    };
    if (media.matches) onChange();
    else observer.observe(el);
    media.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onChange);
    };
  }, [threshold, rootMargin]);

  return [ref, visible];
}
