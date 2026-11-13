# CREATIVE ENGINE FOUNDATION — Execution Plan

**Task**: MW-CE-20261113-2142-01  
**Branch**: `dev`  
**Created**: 2026-11-13  

## Completion execution, 2026-11-14

Working branch: `feat/creative-engine-plan-finish`, isolated on Z:. Existing changes in the main checkout are excluded.

| Work item | Dependency / conflict check | Execution decision |
| --- | --- | --- |
| Motion stylesheet and entrance cleanup | Reveal classes require imported keyframes; entrance owns timers | Restore import and cancel owned timers; verify in browser |
| Reveal accessibility | STORIES and SHADOW hide content before motion; reduced-motion must not hide content | Verify initial and live preference changes |
| Hero parallax | Decorative motion must not displace readable content or conflict with float transforms | Use existing JS hook on separate decorative wrappers |
| Shadow archive adapter | Existing timeline has no Shadow classification; `/shadow` is a demo login | Use neutrally labelled timeline preview, preserve login |
| Mobile composition | Motion and archive preview affect narrow layouts | Verify 320, 390, and 430px layouts after implementation |
| Browser QA and performance | Measurements depend on final code and production build | Run after implementation, record local lab evidence only |
| Commit and push | Main checkout has unrelated WIP; original ledger is stale | Commit only this branch's changes and push feature branch |

Ruling: Explicitly deferred ScrollTrigger/p5 choreography and additional engines remain future scope, not completed requirements. Current hero polish uses the existing parallax hook. Cost if wrong: a separate choreography iteration is needed.

Ruling: Without a Shadow classification in the existing API, show actual timeline entries as a neutral archive preview rather than inventing classified records. Cost if wrong: replace selection when a real Shadow content contract exists.

Ruling: Push the isolated feature branch, not the shared `dev` branch. Cost if wrong: integration requires a subsequent merge, but concurrent work stays protected.

- [x] Complete active remaining implementation with regression evidence
- [x] Complete desktop/mobile, cleanup, hydration, and local performance QA (no field INP dataset)
- [x] Reconcile PLAN, REPORT, and DECISIONS with current evidence
- [x] Review isolated branch; commit and push are the delivery gate reported with remote-head verification

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

## Phase 6 — QA (completion verification in progress)

- [x] Run `pnpm --filter @moonwitness/web typecheck` — passes
- [x] Run `pnpm --filter @moonwitness/web lint` — passes (0 errors, 3 pre-existing warnings)
- [x] Run `pnpm --filter @moonwitness/web build` — passes (all 12 routes generated)
- [x] Manual browser test of desktop layout
- [x] Manual browser test of mobile layout (supplemented by 320/390/430px automation)
- [x] Check animation cleanup on scroll/unmount, including delayed brush factory regression
- [x] Verify no hydration errors in inspected Chrome navigations

---

## Phase 7 — Report & Push (completion verification in progress)

- [x] Write `REPORT.md` with findings
- [x] Historical implementation integrated via `c92d3fb` (the previous `f786ab0` ledger reference was stale)
- [x] Completion delivery targets `origin/feat/creative-engine-plan-finish`, authorized on 2026-11-14; commit hash and remote verification reported in delivery message, not embedded in their own commit
