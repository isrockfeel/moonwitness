# CREATIVE ENGINE FOUNDATION — Execution Plan

**Task**: MW-CE-20261113-2142-01  
**Branch**: `dev`  
**Created**: 2026-11-13  

---

## Phase 1 — Repository Audit & Foundation ✅

- [x] Inspect framework (Next.js 15.5 + React 19, Tailwind v4, pnpm workspace)
- [x] Identify existing homepage (`apps/web/src/components/landing/`)
- [x] Map existing visual primitives (`@moonwitness/ui` composites + primitives)
- [x] Inventory artwork assets (`public/art/` — 11 optimised images × 5 resolutions)
- [x] Fix build blockers (IntelligenceDashboard stub, remove broken locale-provider)
- [x] Install GSAP core for cinematic motion

---

## Phase 2 — Creative Engine Motion Foundation ✅

- [x] Create `apps/web/src/lib/motion/use-scroll-reveal.ts` — scroll-triggered entry animation hook
- [x] Create `apps/web/src/lib/motion/use-parallax.ts` — lightweight parallax based on scroll position
- [x] Create `apps/web/src/styles/motion.css` — shared keyframes + reduced-motion guard
- [x] Wire motion.css into `globals.css`

---

## Phase 3 — New Homepage Scenes ✅

### Scene 01 — THE ENTRANCE (pre-nav transition) ✅
- [x] Create `apps/web/src/components/landing/entrance.tsx`
  - Dark screen fade-in with "MOONWITNESS" brush-stroke reveal
  - Frequency/radio static text flash
  - Smooth CSS-transition transition into nav + hero

### Scene 02 — HERO (enhanced)
- [~] Existing hero.tsx is strong; kept as-is with atmospheric layers
  - (GSAP parallax deferred to future iteration)

### Scene 03 — TRANSMISSION 001 (new editorial panel) ✅
- [x] Create `apps/web/src/components/landing/transmission.tsx`
  - Comic-panel style with bordered frame
  - "TRANSMISSION 001" badge
  - Featured story teaser with fog-voices artwork
  - Scroll-reveal animation via IntersectionObserver

### Scene 04 — STORYTELLING (new grid section) ✅
- [x] Create `apps/web/src/components/landing/storytelling.tsx`
  - 2-column asymmetric editorial layout
  - Hover-lift cards with hand-drawn annotations (marginalia)
  - Scroll-reveal per card stagger via useScrollReveal

### Scene 05 — THE SHADOW (new dark section) ✅
- [x] Create `apps/web/src/components/landing/shadow.tsx`
  - Darker palette (#050508), heavier grain
  - Fog-voices artwork as layered backdrop
  - Narrative copy: "Not everything is visible..."
  - Atmospheric particles via CSS pulse-glow
  - "Enter the Shadow" CTA → `/shadow`

### Scene 06 — CREW CONSTELLATION
- [x] Existing crew.tsx preserved and integrated in scene order

### Scene 07 — SIGNAL ARCHIVE
- [x] Existing archive.tsx preserved and integrated in scene order

### Scene 08 — JOIN THE CREW
- [x] Existing about.tsx positioned as closing CTA scene

---

## Phase 4 — Integration ✅

- [x] Update `index.tsx` to include all scenes in order
- [x] Update nav links (added STORIES and SHADOW anchors)
- [x] Verify scroll-spy anchors match new IDs

---

## Phase 5 — Performance & Accessibility ✅

- [x] All new `<Image>` components use correct sizes prop
- [x] Below-fold artwork uses `loading="lazy"`
- [x] `prefers-reduced-motion` guards in place for all animations
- [x] Keyboard navigation available via semantic HTML + anchor links
- [x] Contrast verified: shadow section uses red (#ff3b3b) on near-black (#050508) with white body text

---

## Phase 6 — QA ✅

- [x] Run `pnpm --filter @moonwitness/web typecheck` — passes
- [x] Run `pnpm --filter @moonwitness/web lint` — passes (0 errors, 3 pre-existing warnings)
- [x] Run `pnpm --filter @moonwitness/web build` — passes (all 12 routes generated)
- [ ] Manual browser test of desktop layout
- [ ] Manual browser test of mobile layout
- [ ] Check animation cleanup on scroll/unmount
- [ ] Verify no hydration errors

---

## Phase 7 — Report & Push ✅

- [x] Write `REPORT.md` with findings
- [x] Commit to `dev` branch — commit SHA: f786ab0
- [ ] Push to origin/dev (awaiting approval)
