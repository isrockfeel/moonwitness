import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function useHeroIntro() {
  const root = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let context: gsap.Context | undefined;
    const finish = () => {
      context?.revert();
      context = undefined;
    };
    const onPreference = () => {
      if (media.matches) finish();
    };
    media.addEventListener("change", onPreference);
    if (!media.matches) {
      try {
        context = gsap.context(() => {}, element);
        context.add(() => {
          const timeline = gsap.timeline({
            onStart: () =>
              element.dispatchEvent(
                new CustomEvent("hero:timeline-start", {
                  bubbles: true,
                  detail: timeline.getChildren(false, true, false).map((tween) => {
                    const targets = tween.targets() as HTMLElement[];
                    const target = targets[0];
                    return {
                      target: target?.hasAttribute("data-hero-headline")
                        ? "headline"
                        : target?.hasAttribute("data-hero-character-reveal")
                          ? "character"
                          : "annotations",
                      start: tween.startTime(),
                      duration: tween.duration(),
                      scoped: targets.every((item) => item.closest("[data-hero-root]")),
                    };
                  }),
                }),
              ),
          });
          timeline
            .from(
              "[data-hero-headline]",
              { x: -24, rotation: -2, opacity: 0, duration: 0.45, ease: "power3.out" },
              0.1,
            )
            .from(
              "[data-hero-character-reveal]",
              { y: 24, rotation: 1, opacity: 0, duration: 0.55, ease: "power2.out" },
              0.2,
            )
            .from(
              "[data-hero-annotations]",
              { y: 10, opacity: 0, duration: 0.45, ease: "power2.out" },
              0.4,
            );
        });
      } catch {
        // A failed enhancement must restore the usable server-rendered composition.
        finish();
      }
    }
    return () => {
      media.removeEventListener("change", onPreference);
      finish();
    };
  }, []);
  return root;
}
