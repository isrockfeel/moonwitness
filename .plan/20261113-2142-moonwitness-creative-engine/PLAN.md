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

## Phase 2 — Creative Engine Motion Foundation

- [ ] Create `apps/web/src/lib/motion/useScrollReveal.ts` — scroll-triggered entry animation hook
- [ ] Create `apps/web/src/lib/motion/useParallax.ts` — lightweight parallax based on scroll position
- [ ] Create `apps/web/src/styles/motion.css` — shared keyframes + reduced-motion guard
- [ ] Wire motion.css into `globals.css`

---

## Phase 3 — New Homepage Scenes

### Scene 01 — THE ENTRANCE (pre-nav transition)
- [ ] Create `apps/web/src/components/landing/entrance.tsx`
  - Dark screen fade-in with "MOONWITNESS" brush-stroke reveal
  - Frequency/radio static text flash
  - Smooth transition into nav + hero

### Scene 02 — HERO (enhanced)
- [ ] Improve existing `hero.tsx`: add GSAP parallax on the background image
- [ ] Add more hand-drawn animated splatter/star elements with GSAP

### Scene 03 — TRANSMISSION 001 (new editorial panel)
- [ ] Create `apps/web/src/components/landing/transmission.tsx`
  - Comic-panel style with bordered frame
  - "TRANSMISSION 001" badge
  - Featured story teaser with artwork
  - GSAP scroll-triggered panel assembly

### Scene 04 — STORYTELLING (enhanced grid)
- [ ] Enhance existing signals.tsx or create `storytelling.tsx`
  - 2-column asymmetric editorial layout
  - Hover-lift cards with hand-drawn annotations
  - Scroll-reveal per card stagger

### Scene 05 — THE SHADOW (new dark section)
- [ ] Create `apps/web/src/components/landing/shadow.tsx`
  - Darker palette (#050508), heavier grain
  - Fog-voices artwork as layered backdrop
  - Narrative copy: "Not everything is visible..."
  - Atmospheric particles via CSS
  - "Enter the Shadow" CTA → `/shadow`

### Scene 06 — CREW CONSTELLATION (enhanced)
- [ ] Existing crew.tsx is solid; add GSAP star-marker pulse on scroll

### Scene 07 — SIGNAL ARCHIVE (enhanced)
- [ ] Existing archive.tsx is solid; add GSAP strip reveal animation on enter viewport

### Scene 08 — JOIN THE CREW (enhanced closing)
- [ ] Enhance existing about.tsx to be the proper scene 08
  - Bigger punk typography
  - Collage composition with multiple art elements
  - Strong closing statement

---

## Phase 4 — Integration

- [ ] Update `index.tsx` to include all scenes in order
- [ ] Update nav links (add "SHADOW" link if landing page has it)
- [ ] Verify scroll-spy anchors match new IDs

---

## Phase 5 — Performance & Accessibility

- [ ] Ensure all new `<Image>` components use correct sizes prop
- [ ] Lazy-load below-fold artwork ( Next.js `loading="lazy"`)
- [ ] Add `prefers-reduced-motion` guards to all GSAP tweens
- [ ] Ensure keyboard navigation to all scene sections
- [ ] Verify contrast ratios on new dark section

---

## Phase 6 — QA

- [ ] Run `pnpm --filter @moonwitness/web typecheck`
- [ ] Run `pnpm --filter @moonwitness/web lint`
- [ ] Run `pnpm --filter @moonwitness/web build`
- [ ] Manual browser test of desktop layout
- [ ] Manual browser test of mobile layout
- [ ] Check animation cleanup on scroll/unmount
- [ ] Verify no hydration errors

---

## Phase 7 — Report & Push

- [ ] Write `REPORT.md` with findings
- [ ] Commit to `dev` branch
- [ ] Push to origin/dev (awaiting approval)
