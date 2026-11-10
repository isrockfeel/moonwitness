"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { artSrc } from "@/lib/art";
import { timelineEvents, witnesses, kindColors } from "@/lib/data";
import { ArrowRight, Bolt, Crown, PlayIcon, PauseIcon, Smiley, Splatter, Star4 } from "@moonwitness/ui/icons";
import { Grain, Halftone, Tape } from "@moonwitness/ui";
import { SiteNav } from "./site-nav";

function TransmissionCard() {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const total = 204;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= total) {
          setPlaying(false);
          return total;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <article className="zine-card-rough group relative flex flex-col overflow-hidden">
      <div className="relative h-44 overflow-hidden">
        <Image
          src="/art/signal-tunnel.png"
          alt="A lone figure walking into a red-lit tunnel"
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <span className="sticker sticker-yellow absolute left-3 top-3 px-3 py-1 font-brush text-xs">
          TRANSMISSION 001
        </span>
        <button
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? "Pause transmission" : "Play transmission"}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 bg-black/60 text-white backdrop-blur transition hover:scale-110 hover:border-[var(--pink)] hover:text-[var(--pink)]"
        >
          {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-brush text-2xl leading-tight text-white">A SIGNAL FROM BELOW</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
          Strange sounds. A deeper current. What are we really hearing?
        </p>
        <div className="mt-4">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
            role="progressbar"
            aria-valuenow={elapsed}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Transmission progress"
          >
            <div
              className="h-full bg-[var(--pink)] transition-[width] duration-300"
              style={{ width: `${(elapsed / total) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
            <span className={playing ? "text-[var(--pink)]" : ""}>
              {playing ? "● RECEIVING…" : elapsed >= total ? "TRANSMISSION ENDED" : "STANDBY"}
            </span>
            <span>
              {fmt(elapsed)} / {fmt(total)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / 1400, 1);
          setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {value.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

function CrewConstellation() {
  const [selected, setSelected] = useState(witnesses[0]!);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="zine-card-rough relative overflow-hidden p-4">
        <div className="halftone relative h-72 overflow-hidden rounded-md bg-[#0d0d16] sm:h-80">
          <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" aria-hidden>
            {witnesses.map((a, i) =>
              witnesses
                .slice(i + 1)
                .map((b) => (
                  <line
                    key={`${a.id}-${b.id}`}
                    x1={a.x}
                    y1={a.y * 0.7}
                    x2={b.x}
                    y2={b.y * 0.7}
                    stroke={i % 2 ? "#ff2d78" : "#2ea8ff"}
                    strokeWidth="0.18"
                    strokeDasharray="1.2 1.6"
                    opacity="0.45"
                  />
                )),
            )}
            {witnesses.map((w) => (
              <circle
                key={w.id}
                cx={w.x}
                cy={w.y * 0.7}
                r={selected.id === w.id ? 2.2 : 1.3}
                fill={selected.id === w.id ? "#ffd21f" : "#ff2d78"}
                className="pulse-dot"
                style={{ animationDelay: `${w.x * 20}ms` }}
              />
            ))}
          </svg>
          {witnesses.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w)}
              aria-label={`Witness ${w.name}, ${w.place}`}
              aria-pressed={selected.id === w.id}
              className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 font-hand text-sm font-bold transition-all ${
                selected.id === w.id
                  ? "z-10 scale-125 border-[var(--yellow)] bg-[var(--yellow)] text-black"
                  : "border-white/60 bg-[var(--panel-2)] text-white hover:scale-110 hover:border-[var(--pink)]"
              }`}
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
            >
              {w.name[0]}
            </button>
          ))}
          <span className="sticker sticker-pink absolute bottom-3 left-3 -rotate-2 px-3 py-1 font-hand text-base font-bold">
            REAL PEOPLE. REAL PLACES. SAME SKY.
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "CREW MEMBERS", target: 1324 },
            { label: "COUNTRIES", target: 87 },
            { label: "SIGNALS", target: 6912 },
          ].map((s) => (
            <div
              key={s.label}
              className="border border-[var(--line)] bg-[var(--panel-2)] px-2 py-3"
            >
              <div className="font-brush text-xl text-[var(--yellow)] sm:text-2xl">
                <CountUp target={s.target} />
              </div>
              <div className="mt-1 text-[10px] tracking-widest text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="zine-card relative flex-1 p-5" aria-live="polite">
          <Tape className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--pink)] bg-[var(--panel-2)] font-brush text-xl text-[var(--pink)]">
              {selected.name[0]}
            </span>
            <div>
              <div className="font-brush text-lg text-white">{selected.name}</div>
              <div className="text-xs text-zinc-500">{selected.place}</div>
            </div>
            <Crown className="ml-auto h-4 w-6 text-[var(--yellow)]" />
          </div>
          <p className="mt-4 font-hand text-xl leading-snug text-zinc-200">“{selected.quote}”</p>
          <div className="mt-4 text-xs text-zinc-500">
            <span className="text-[var(--blue)]">{selected.signals}</span> signals contributed
          </div>
        </div>
        <Link href="/shadow" className="btn-zine btn-blue px-5 py-3 text-base">
          EXPLORE THE CREW <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function ArchiveStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  const items = timelineEvents.slice(0, 8);

  return (
    <div className="relative">
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
        {items.map((ev) => (
          <Link
            key={ev.id}
            href={`/dock?event=${ev.id}`}
            className="zine-card group w-60 shrink-0 overflow-hidden transition-transform hover:-translate-y-1"
          >
            <div className="relative h-28 overflow-hidden">
              <Image
                src={artSrc(ev.image)}
                alt=""
                fill
                className="object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                style={{ objectPosition: ev.imagePosition ?? "center" }}
                sizes="240px"
              />
              <span
                className="absolute left-2 top-2 px-2 py-0.5 font-brush text-[10px]"
                style={{
                  background: kindColors[ev.kind],
                  color: ev.kind === "SIGNAL" ? "#111" : "#fff",
                }}
              >
                {ev.kind}
              </span>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-zinc-500">{ev.date}</div>
              <div className="mt-1 font-brush text-sm leading-snug text-white group-hover:text-[var(--pink)]">
                {ev.title.toUpperCase()}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Link href="/dock" className="btn-zine btn-blue px-4 py-2 text-sm">
          BROWSE ARCHIVE <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll archive left"
            className="zine-card px-3 py-1.5 text-zinc-300 hover:text-[var(--pink)]"
          >
            ←
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll archive right"
            className="zine-card px-3 py-1.5 text-zinc-300 hover:text-[var(--pink)]"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="relative">
      <SiteNav />

      {/* HERO */}
      <section
        id="home"
        className="relative flex min-h-[92vh] items-center overflow-hidden pt-16"
      >
        <Grain />
        <Image
          src="/art/hero-witness.png"
          alt="A witness in a magenta jacket looking up at the moon over the neon city"
          fill
          priority
          className="object-cover object-[30%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.85)] via-[rgba(11,11,16,0.35)] to-transparent" />
        <Splatter className="absolute -left-10 top-24 h-56 w-56 text-[var(--pink)] opacity-70" />
        <Star4 className="absolute right-[12%] top-28 h-8 w-8 text-[var(--pink)]" />
        <Bolt className="absolute bottom-24 left-[42%] hidden h-12 w-9 text-[var(--yellow)] md:block" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-3xl rise-in">
            <div className="relative inline-block">
              <Splatter className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] text-[var(--pink)] opacity-80" />
              <h1 className="font-brush relative text-[clamp(2.25rem,11vw,3.75rem)] leading-none text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)] sm:text-8xl">
                MOON<span className="text-[var(--pink)]">WITNESS</span>
              </h1>
              <Crown className="absolute -top-7 right-2 h-8 w-12 -rotate-12 text-[var(--yellow)]" />
            </div>
            <div className="sticker sticker-yellow mt-6 inline-block -rotate-1 px-5 py-2.5 font-brush text-sm tracking-wide sm:text-lg">
              PEOPLE. PLACES. STORIES. ANOTHER SIDE OF REALITY.
            </div>
            <div className="sticker mt-6 max-w-md rotate-[-1.5deg] p-5">
              <Tape className="-top-3 left-8 -rotate-6" />
              <p className="font-hand text-xl font-bold leading-snug sm:text-2xl">
                A global story network for curious humans. Different people. Same moon. Bigger
                perspectives.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/dock" className="btn-zine px-8 py-4 text-xl">
                EXPLORE THE SIGNALS <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute right-6 top-32 hidden rotate-3 lg:block">
          <div
            className="sticker float-y px-4 py-3 font-hand text-xl font-bold"
            style={{ "--rot": "3deg" } as React.CSSProperties}
          >
            LOOK FURTHER
            <br />
            THAN WE DO.
          </div>
        </div>
        <div className="absolute bottom-28 right-[8%] hidden -rotate-2 lg:block">
          <div
            className="sticker sticker-black float-y border border-[var(--line)] px-4 py-3 font-hand text-xl"
            style={{ "--rot": "-2deg", animationDelay: "1.2s" } as React.CSSProperties}
          >
            SAME MOON.
            <br />
            DIFFERENT WITNESSES.
          </div>
        </div>
        <Smiley className="absolute bottom-16 left-[6%] hidden h-12 w-12 -rotate-12 text-[var(--yellow)] md:block" />
      </section>

      {/* MARQUEE */}
      <div
        className="overflow-hidden border-y-2 border-[var(--line)] bg-[var(--pink)] py-2.5"
        aria-hidden
      >
        <div className="marquee-track flex w-max gap-8 font-brush text-lg text-white">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-8">
              {[
                "SAME MOON",
                "DIFFERENT PEOPLE",
                "BIGGER PERSPECTIVES",
                "ANOTHER SIDE OF REALITY",
                "STORIES KEEP ORBITING",
                "FOLLOW THE SIGNAL",
              ].map((t) => (
                <span key={t} className="flex items-center gap-8">
                  {t} <Star4 className="h-4 w-4 text-[var(--yellow)]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* SIGNALS / FEATURES */}
      <section id="signals" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-brush text-3xl text-white sm:text-4xl">
            THE <span className="brush-underline">SIGNALS</span>
          </h2>
          <Crown className="h-6 w-9 text-[var(--yellow)]" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <TransmissionCard />

          <article className="zine-card-rough group relative flex flex-col overflow-hidden">
            <div className="relative h-44 overflow-hidden">
              <Image
                src="/art/crew-rooftop.png"
                alt="Three friends on a rooftop under the same moon"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="sticker sticker-yellow absolute left-3 top-3 px-3 py-1 font-brush text-xs">
                STORYTELLING
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-brush text-2xl leading-tight text-white">
                REAL PEOPLE. BIGGER HORIZONS.
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                firsthand accounts, visual stories, and unfiltered perspectives from around the
                world.
              </p>
              <Link href="/dock" className="btn-zine btn-blue mt-4 self-start px-5 py-2.5 text-sm">
                EXPLORE STORIES <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="zine-card-rough group relative flex flex-col overflow-hidden">
            <div className="relative h-44 overflow-hidden">
              <Image
                src="/art/city-shadow.png"
                alt="A hooded witness overlooking the city at night"
                fill
                className="object-cover object-[70%_center] transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="sticker sticker-pink absolute left-3 top-3 px-3 py-1 font-brush text-xs">
                THE SHADOW
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-brush text-2xl leading-tight text-white">
                NOT EVERYTHING IS VISIBLE.
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                A deeper layer of Moonwitness. Unexplained stories. Hidden connections, and what
                lives in the in-between.
              </p>
              <Link
                href="/shadow"
                className="btn-zine btn-yellow mt-4 self-start px-5 py-2.5 text-sm"
              >
                ENTER THE SHADOW <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* CREW */}
      <section
        id="crew"
        className="relative scroll-mt-20 border-y-2 border-[var(--line)] bg-[var(--panel)] py-20"
      >
        <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="sticker sticker-blue inline-block -rotate-1 px-4 py-1.5 font-brush text-sm">
                CREW CONSTELLATION
              </span>
              <h2 className="font-brush mt-4 text-3xl text-white sm:text-4xl">
                A GLOBAL MAP OF WITNESSES.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Different places. Different perspectives. Same moon. Click a witness to hear their
                signal.
              </p>
            </div>
            <div className="relative hidden h-28 w-56 overflow-hidden rounded-md border-2 border-[var(--line)] md:block">
              <Image
                src="/art/crew-rooftop.png"
                alt=""
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
          </div>
          <CrewConstellation />
        </div>
      </section>

      {/* ARCHIVE */}
      <section id="archive" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="sticker sticker-yellow inline-block rotate-1 px-4 py-1.5 font-brush text-sm">
              ARCHIVE
            </span>
            <h2 className="font-brush mt-4 text-3xl text-white sm:text-4xl">
              A TIMELINE OF SIGNALS.
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Past transmissions, ongoing mysteries, and the stories that connect them.
            </p>
          </div>
          <Smiley className="hidden h-10 w-10 rotate-12 text-[var(--pink)] sm:block" />
        </div>
        <ArchiveStrip />
      </section>

      {/* ABOUT / JOIN */}
      <section
        id="about"
        className="relative scroll-mt-20 overflow-hidden border-t-2 border-[var(--line)]"
      >
        <Grain />
        <Image
          src="/art/crew-rooftop.png"
          alt=""
          fill
          className="object-cover object-center opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[rgba(11,11,16,0.6)] to-[rgba(11,11,16,0.8)]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
          <Crown className="mx-auto mb-4 h-10 w-14 text-[var(--yellow)]" />
          <h2 className="font-brush text-5xl leading-tight text-[var(--pink)] drop-shadow-[3px_3px_0_rgba(0,0,0,0.9)] sm:text-7xl">
            JOIN THE CREW
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-hand text-2xl text-zinc-200">
            More stories. More places. More perspectives. A brighter world.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/shadow" className="btn-zine btn-paper px-8 py-4 text-xl">
              BECOME A MOONWITNESS <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/mission-control" className="btn-zine btn-blue px-8 py-4 text-xl">
              MISSION CONTROL
            </Link>
          </div>
          <div className="sticker sticker-yellow mx-auto mt-10 inline-block rotate-2 px-4 py-2 font-hand text-lg font-bold">
            STORIES KEEP ORBITING.
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-[var(--line)] bg-[var(--ink)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-6 text-[var(--yellow)]" />
            <span className="font-brush text-sm text-white">
              MOON<span className="text-[var(--pink)]">WITNESS</span>
            </span>
            <span className="text-xs text-zinc-600">// Create · Curate · Publish</span>
          </div>
          <nav className="flex gap-5 text-xs text-zinc-500" aria-label="Footer">
            <Link href="/dock" className="hover:text-[var(--pink)]">
              Archive
            </Link>
            <Link href="/shadow" className="hover:text-[var(--pink)]">
              The Shadow
            </Link>
            <Link href="/mission-control" className="hover:text-[var(--pink)]">
              Mission Control
            </Link>
            <a href="#home" className="hover:text-[var(--pink)]">
              Back to top ↑
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
