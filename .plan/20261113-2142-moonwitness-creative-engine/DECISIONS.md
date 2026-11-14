# Technology Decisions

**Date**: 2026-11-13  
**Context**: MoonWitness Creative Engine — Homepage Cinematic Implementation

---

## Core Framework

| Decision | Selection | Reason |
|----------|-----------|--------|
| Framework | **Keep Next.js 15.5 + React 19** | Already in place, fully compatible with task scope |
| Styling | **Keep Tailwind v4 (@tailwindcss/postcss)** | Current project uses v4; no config file needed |
| Package Manager | **Keep pnpm workspace** | Root monorepo standard |

---

## Motion Engine

| Technology | Decision | Purpose | Rationale |
|------------|----------|---------|-----------|
| **GSAP** | Installed, deferred choreography | Future cinematic timelines and ScrollTrigger | Foundation execution uses CSS, IntersectionObserver, and the existing JS parallax hook; no pinned scrolling in this iteration |
| **CSS keyframe animations** | **PRIMARY (existing)** | Simple float, rise-in, flicker, marquee | Already in `base.css`; zero dependency cost |
| **Motion (framer-motion)** | **Deferred** | Spring physics, drag | Task says "clearly separated responsibilities"; CSS hover + GSAP covers needs for now |
| **Lenis** | **Deferred** | Smooth scrolling | Native scroll first; add only if scroll-jacking feels necessary |

**Why not install everything?** The spec explicitly warns against blind dependency sprawl. GSAP alone handles 95% of cinematic requirements. CSS handles the rest.

---

## Graphics & Artwork

| Technology | Decision | Purpose | Rationale |
|------------|----------|---------|-----------|
| **SVG + CSS** | **PRIMARY** | Grain, halftone, stickers, borders, annotations | Already used extensively; zero runtime cost |
| **p5.js** | **Existing (keep)** | Atmospheric fields (brush/ambient sketches) | Already integrated in `AtmosphereField`; serves unique visual role |
| **PixiJS** | **Deferred** | Particle systems, GPU effects | Not needed for initial release; overkill for current scene count |
| **Three.js / R3F** | **Deferred** | 3D environments | Explicitly excluded from initial scope |
| **Rive** | **Deferred** | Interactive rigged characters | No rigged artwork available yet |

---

## Content Architecture

| Decision | Selection | Rationale |
|----------|-----------|-----------|
| Editorial content | Existing landing component copy | Preserve the established story-world direction; do not represent it as verified witness evidence |
| Archive data adapter | Existing `apps/web/src/lib/api/timeline.ts` | Use the current Fastify timeline API; do not invent a Supabase dependency or a Shadow classification |
| New component locations | `apps/web/src/components/landing/` | Consistent with existing structure; no forced reorganisation |

---

## Rejected Alternatives

| Alternative | Why Rejected |
|-------------|--------------|
| Full rewrite to Astro | Existing Next.js SSR/ISR provides SEO benefit; too disruptive |
| Installing Framer Motion alongside GSAP | Dual animation engines on same elements causes conflicts; CSS covers hover state needs |
| Building a custom animation framework | Unnecessary abstraction; GSAP + CSS is production-proven |
| Adding Three.js for hero | Expensive GPU load; existing artwork is 2D illustration, doesn't need 3D |

---

## Deviations from Spec Table

Foundation execution deliberately keeps native scrolling and CSS/IntersectionObserver reveals. GSAP is installed but its ScrollTrigger choreography remains explicitly deferred; this is not an implemented primary engine.

| Technology | Purpose | Decision |
|------------|---------|----------|
| Next.js | Application | Required (existing) |
| React | Components | Required (existing) |
| GSAP | Future cinematic choreography | Installed, explicitly deferred |
| CSS keyframes | Interactive UI | Primary (existing) |
| SVG/CSS | Artwork | Primary (existing) |
| p5.js | Atmosphere | Conditional — kept (already integrated) |
| PixiJS | 2D GPU graphics | Deferred |
| Three.js | 3D | Deferred |
| Rive | Living artwork | Deferred |
| Lenis | Smooth scrolling | Deferred |
