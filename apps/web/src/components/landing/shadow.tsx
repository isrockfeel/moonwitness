"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, SkullCrossbonesFunky, SprayCan } from "@moonwitness/ui/icons";
import { DistressedSticker, Grain, Staple } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";

export function Shadow() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const paraRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || !entry.isIntersecting) return;

        const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
        if (titleRef.current) {
          titleRef.current.style.transition = `opacity 0.8s ${ease}, transform 0.8s ${ease}`;
          titleRef.current.style.opacity = "1";
          titleRef.current.style.transform = "none";
        }
        if (paraRef.current) {
          paraRef.current.style.transition = `opacity 0.6s ${ease} 0.2s, transform 0.6s ${ease} 0.2s`;
          paraRef.current.style.opacity = "1";
          paraRef.current.style.transform = "none";
        }
        if (ctaRef.current) {
          ctaRef.current.style.transition = `opacity 0.5s ${ease} 0.4s, transform 0.5s ${ease} 0.4s`;
          ctaRef.current.style.opacity = "1";
          ctaRef.current.style.transform = "none";
        }

        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    const el = sectionRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="shadow"
      className="relative scroll-mt-20 overflow-hidden bg-[#050508] py-28"
    >
      <Grain />
      <Image
        src={artSrc("fog-voices")}
        alt=""
        fill
        className="absolute inset-0 object-cover opacity-20 mix-blend-overlay"
        sizes="100vw"
        loading="lazy"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050508] via-[rgba(5,5,8,0.7)] to-[#050508]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[var(--pink)] opacity-20 pulse-glow"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-12 flex items-center gap-3">
          <SkullCrossbonesFunky className="h-6 w-6 text-[var(--red)] opacity-70" />
          <span className="font-mono text-xs font-black tracking-[0.25em] text-[var(--red)] opacity-80">
            RESTRICTED FREQUENCY // LEVEL 4
          </span>
          <SprayCan className="ml-auto h-5 w-5 text-[var(--red)] opacity-50 rotate-12" />
        </div>

        <h2
          ref={titleRef}
          className="cmyk-slip font-brush text-5xl leading-none text-zinc-100 drop-shadow-[6px_6px_0_rgba(255,59,59,0.3)] sm:text-7xl md:text-8xl opacity-0"
          style={{ transform: "translateY(50px) scale(0.95)" }}
        >
          NOT EVERYTHING
          <br />
          IS <span className="text-[var(--red)]">VISIBLE</span>
          <span className="text-[var(--pink)]">.</span>
        </h2>

        <p
          ref={paraRef}
          className="mt-8 max-w-2xl font-hand text-xl leading-relaxed text-zinc-400 opacity-0"
          style={{ transform: "translateX(-30px)" }}
        >
          Beneath the signals we publish lies a deeper stratum — transmissions that don&rsquo;t fit
          standard categories, sightings that resist easy explanation, and connections between
          witnesses that only emerge in retrospect. This is the Shadow layer of MoonWitness: where
          the signal gets noisy, and the noise sometimes speaks back.
        </p>

        <div className="mt-12 relative inline-block">
          <Staple className="-top-1 left-10 -rotate-12" />
          <div className="zine-card-rough relative overflow-hidden border-[var(--red)]/40">
            <div className="relative aspect-[16/9] overflow-hidden bg-[#0a0a12]">
              <Image
                src={artSrc("night-shift")}
                alt="A lone figure on a rooftop at night, watching something unseen"
                fill
                className="object-cover object-[50%_40%] grayscale contrast-[1.3] brightness-75"
                sizes="(max-width: 768px) 100vw, 720px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[var(--red)] mix-blend-color opacity-15" />
            </div>
            <div className="border-t border-[var(--red)]/30 bg-[#08080e] p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-[var(--red)] opacity-80">
                  SHADOW ARCHIVE #001 — THE WATCHER ON THE ROOF
                </span>
                <DistressedSticker variant="classified" className="rotate-3" />
              </div>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                Three separate reports. Same location. Different nights. All describe the same
                figure — motionless, facing away from the camera, staring toward the moon.
              </p>
            </div>
          </div>
        </div>

        <div
          ref={ctaRef}
          className="mt-12 flex flex-wrap items-center gap-5 opacity-0"
          style={{ transform: "translateY(20px)" }}
        >
          <Link
            href="/shadow"
            className="btn-zine px-8 py-4 text-xl shadow-[5px_5px_0_rgba(255,59,59,0.5)]"
            style={{ "--btn-bg": "#1a0a0a", "--btn-fg": "#ff3b3b" } as React.CSSProperties}
          >
            ENTER THE SHADOW <ArrowRight className="h-5 w-5" />
          </Link>
          <DistressedSticker variant="barcode" code="SHD-LEVEL-4" className="rotate-[-2deg]" />
        </div>
      </div>
    </section>
  );
}
