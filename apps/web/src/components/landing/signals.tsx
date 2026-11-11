"use client";

import Image from "next/image";
import Link from "next/link";
import { timelineEvents } from "@/lib/data";
import { artSrc } from "@/lib/art";
import { ArrowRight, Crown } from "@moonwitness/ui/icons";
import { TransmissionCard } from "@moonwitness/ui";

/** Kartu promosi meminjam copy event ini; artwork tetap terowongan merah sesuai acuan landing. */
const transmissionEvent = timelineEvents.find((e) => e.id === "voices-in-the-fog");

export function Signals() {
  return (
    <section id="signals" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-brush text-3xl text-white sm:text-4xl">
          THE <span className="brush-underline">SIGNALS</span>
        </h2>
        <Crown className="h-6 w-9 text-[var(--yellow)]" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {transmissionEvent ? (
          <TransmissionCard
            event={transmissionEvent}
            art="signal-tunnel"
            title="A SIGNAL FROM BELOW"
            excerpt="Strange sounds. A deeper current. What are we really hearing?"
          />
        ) : null}

        <article className="zine-card-rough group relative flex flex-col overflow-hidden">
          <div className="relative h-44 overflow-hidden">
            <Image
              src={artSrc("crew-rooftop")}
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
              firsthand accounts, visual stories, and unfiltered perspectives from around the world.
            </p>
            <Link href="/dock" className="btn-zine btn-blue mt-4 self-start px-5 py-2.5 text-sm max-lg:min-h-11">
              EXPLORE STORIES <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <article className="zine-card-rough group relative flex flex-col overflow-hidden">
          <div className="relative h-44 overflow-hidden">
            <Image
              src={artSrc("city-shadow")}
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
              A deeper layer of Moonwitness. Unexplained stories. Hidden connections, and what lives
              in the in-between.
            </p>
            <Link href="/shadow" className="btn-zine btn-yellow mt-4 self-start px-5 py-2.5 text-sm max-lg:min-h-11">
              ENTER THE SHADOW <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
