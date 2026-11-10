# Implementation Plan: Design System Frontend Moonwitness

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan design system zine dari dalam `apps/web` ke `packages/{types,ui,assets}`, memecah file komponen raksasa, menaikkan a11y/performa, lalu mengganti isi `/mission-control` dengan Shadow Command Center sesuai referensi `06-shadow-command-center.png`.

**Architecture:** Tiga paket internal JIT (export source TypeScript, tanpa build step) yang di-transpile Next lewat `transpilePackages`: `packages/types` (tipe domain, nol dependensi), `packages/assets` (manifest artwork + skrip optimasi sharp + referensi ternama), `packages/ui` (token CSS + primitif + ikon + komposit). `apps/web` tetap memegang routing, data (`lib/data.ts`), semua pemakaian `next/image` dan `next/link`, plus komposisi halaman.

**Tech Stack:** Next.js 15.5 App Router, React 19, Tailwind CSS v4, Turborepo 2.5, pnpm 12 workspaces, TypeScript 5.9 strict (`noUncheckedIndexedAccess`), ESLint 9 flat config, Vitest 3 (hanya `packages/core` + `packages/assets`), sharp 0.35 untuk pipeline gambar.

**Spec:** `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` — plan ini berargumen dari spec; eksekutor membaca keduanya. Nomor § merujuk ke spec.

## Global Constraints

Setiap task otomatis tunduk pada semua baris di bawah ini. Nilai disalin persis dari spec.

- **Batas kerja: UI/UX dan frontend saja.** Jangan sentuh `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/**`, logika login di `apps/web/src/app/shadow/page.tsx`, dan apa pun di `packages/core`. Backend/auth dikerjakan tim lain (§2, §10).
- **Tidak ada `next/*` di dalam `packages/ui`** — tidak `next/image`, tidak `next/link`, tidak `next/navigation` (§3.2).
- **`packages/types` nol dependensi runtime** — hanya `types` di `package.json` devDependencies, tidak ada `dependencies` (§3.1).
- **Byte artwork tetap di `apps/web/public/art`.** `packages/assets` memegang manifest + skrip + referensi, bukan docroot (§D3).
- **Setiap file komponen < 150 baris** setelah fase 2 (§7).
- **Kanban tanpa drag-and-drop** di v1 (§D6). `OrbitDiagram` dihapus (§D7).
- **CI tetap satu lane**: `pnpm turbo run lint typecheck test build`. Jangan tambah workflow, matrix, atau lane baru (§9).
- **`optimize.mjs` dijalankan manual, tidak masuk CI** (§3.3).
- **Satu commit per task**, hanya file milik task itu (`git add` eksplisit per path — jangan `git add -A`/`.`).
- **Jangan push, jangan deploy, jangan bikin PR** tanpa diminta eksplisit.
- **Server verifikasi selalu dimatikan** setelah dipakai; port dicek via `netstat`, proses dimatikan via `taskkill` (§9).
- **Warna token tetap persis**: `--ink #0b0b10`, `--panel #14141c`, `--panel-2 #1b1b26`, `--paper #f4eede`, `--pink #ff2d78`, `--blue #2ea8ff`, `--yellow #ffd21f`, `--purple #a855f7`, `--red #ff3b3b`, `--green #3ddc84`, `--line #2a2a38` (§3.2).
- **Blok `prefers-reduced-motion` harus tetap unlayered** di `base.css`. Kalau masuk `@layer components`, animasi tidak bisa dimatikan lagi (§4).
- **Semua kelas komponen CSS di dalam `@layer components`** supaya utility Tailwind (`hidden`, `px-*`, `bg-*`) tetap menang (§4, perbaikan sesi sebelumnya).

## Konvensi perintah verifikasi

Alias berikut dipakai berulang di setiap task. Eksekusi persis seperti tertulis (Git Bash di Windows).

```bash
# VER  — pipeline lengkap (dipakai sebagai gerbang setiap task)
pnpm turbo run lint typecheck build && pnpm --filter @moonwitness/core test && pnpm --filter @moonwitness/assets test

# BUILD — build app saja
pnpm --filter @moonwitness/web build

# SHOT — jalankan produksi, ambil screenshot, matikan lagi
pnpm --filter @moonwitness/web start -p 4317 &
netstat -ano | grep :4317        # catat PID di kolom terakhir
taskkill //PID <pid> //F         # SELALU dijalankan sebelum task ditutup
```

Screenshot diambil untuk 4 route (`/`, `/shadow`, `/mission-control`, `/dock`) pada 3 viewport (`390x844`, `768x1024`, `1440x900`), disimpan ke `.verify/<fase>/` — direktori ini **tidak** di-commit (masuk `.gitignore` di Task 0). Pakai Playwright/browser MCP dengan `scale: "css"`; simpan dengan nama stabil `verify-<fase>-<route>-<lebar>.png`.

**Cara membandingkan screenshot (terikat saat eksekusi, jangan diulang sebagai asumsi).** Diff pixel mentah `.verify/<fase>` vs `.verify/phase0` **bukan** gerbang yang sah: `fullPage` + `loading="lazy"` membuat gambar di bawah lipatan kadang sudah termuat, kadang belum, pada build yang sama. Terukur di Task 1: `dock-768` berbeda 11,5% terhadap baseline padahal tidak ada perubahan tampilan, dan **6,6% terhadap dirinya sendiri** pada capture ulang (`shadow-768`); pita perbedaan ternyata hero `crew-rooftop` dan thumbnail event yang di baseline masih hitam. Karena itu setiap gerbang visual memakai empat bukti ini, berurutan:

1. `document.documentElement.scrollWidth` per route pada 390px — angka harus sama dengan baseline (380).
2. Jumlah `console` error + warning per route, dijaring dengan listener `console`/`pageerror` yang dipasang sebelum `goto` dan dilepas setelahnya — target 0/0.
3. Paritas `src` gambar yang benar-benar dirender: dekode parameter `url=` dari `img[src]` `/_next/image`, hasilnya harus path `/art/*.png` nyata, tidak ada key telanjang (`hero-witness`), tidak ada `naturalWidth === 0` pada gambar yang terlihat.
4. Screenshot tetap diambil dan **diperiksa mata** untuk layout, warna, dan posisi; diff pixel hanya dipakai sebagai penunjuk daerah yang perlu dilihat, dengan catatan bahwa gambar yang belum termuat di salah satu sisi bukan regresi.

Kalau memang butuh capture yang bisa di-diff, bekukan animasi (`animation/transition: none` via `addStyleTag`), gulir seluruh halaman dulu, lalu tunggu `document.images` lengkap (`complete && naturalWidth>0`) sebelum `screenshot`. Batasi satu panggilan MCP per viewport — 12 capture sekaligus melewati timeout pemanggilan alat.

## Nilai yang baru terikat saat eksekusi

Plan ini tidak punya lubang "TBD". Yang ada adalah beberapa nilai `<…>` yang **sengaja** baru bisa dipastikan saat eksekusi, dan setiap satunya punya langkah yang mengikatnya. Jangan menebak lebih awal, dan jangan menulis nilainya ke plan sebelum langkah pengikatnya dijalankan.

| Nilai | Terikat di | Cara mengikat |
|---|---|---|
| `<fase>`, `<route>`, `<lebar>` | Konvensi di atas | Nama folder/nama file screenshot, mengikuti tabel viewport |
| `<pid>` | Setiap SHOT | Kolom terakhir `netstat -ano \| grep :4317` |
| `<path-hasil-imagegen>` | Task 19 Step 2 | Path yang dikembalikan `ImageGen` |
| `<keluarga>`, `<File>`, `<familidirenderkecil>`, `<nama famili>`, `<bobot yang di-load>` | Task 30 Step 2-3 | Kandidat pertama yang lolos lima kriteria Step 1 dan terbukti punya `OFL.txt` + `.ttf` di repo `google/fonts`. Spec §8b memang melarang nama famili ditebak di dokumen |
| `<tanggal>`, `<angka>`, `<satu kalimat karakter>`, `<daftar dari Step 8>` | Step "catat gerbang" di Task 10, 14, 18, 28, 31 | Hasil pengukuran nyata pada langkah sebelumnya di task yang sama |

Selain yang terdaftar di tabel ini, tidak boleh ada `<…>` di kode yang kamu tulis. Kalau kamu menemukannya, itu bug plan — hentikan dan laporkan, jangan isi sendiri.

## Perbaikan terhadap spec (harus dibaca sebelum mulai)

Spec adalah sumber keputusan; sembilan detail implementasi di bawah ini dipertajam di sini karena spec menulis nama ideal, bukan nama yang benar-benar ada di repo. Kalau owner menolak salah satu, ubah bagian itu saja — sisanya tidak terpengaruh.

| # | Isi spec | Dipertajam jadi | Alasan |
|---|---|---|---|
| R1 | §3.1 menyebut `EraId`, `EventKind`, `TimelineEvent`, `ModuleStats`, `MissionAlert` | Nama asli di `lib/data.ts` adalah `DockEvent`, `Alert`, dan `Module["stats"]` inline. Plan memakai `TimelineEvent`, `EventKind`, `EraId`, `MissionAlert`, `ModuleStat` (tunggal) dan menghapus nama lama | Kontrak prop di §3.2 sudah menulis `TimelineEvent`; memakai dua nama untuk satu tipe = kebingungan |
| R2 | §3.2 "bukan ReactNode asing" | Komposit boleh menerima **satu** prop slot `ReactNode` untuk elemen interaktif milik app (mis. `<Link>`), selain `ArtKey` untuk gambar | `CrewConstellation` punya CTA `<Link href="/shadow">`; tanpa slot, link semantics (klik kanan / tab baru) hilang |
| R3 | §3.2 mendaftarkan `ArchiveStrip` sebagai komposit | `ArchiveStrip` **tetap di app** (`components/landing/archive.tsx`) | Isinya scroller 8 `<Link>` + 8 `next/image`; memindahkannya ke paket melanggar dua aturan sekaligus |
| R4 | §7 meminta `mission-control.tsx` dipecah di fase 2 | Fase 2 **tidak** memecah `mission-control.tsx`. Fase 4 membangun `components/command-center/*` dari nol, sudah terpecah | §D4 mengganti seluruh isi halaman; memecah lalu membuang = kerja dua kali |
| R5 | §3.2 kontrak `EventDetail({ event, onRelated })` | `EventDetail({ event, era, relatedEvents, shareUrl, onRelated, onClose? })` | Versi sekarang membaca `dockEvents`/`eras` dari data app dan memanggil `window.location`; paket tidak boleh melakukan keduanya |
| R6 | §5 "hero/LCP tetap di apps/web dengan next/image" + "sharp menghasilkan AVIF+WebP" | Dua jalur gambar: (a) hero/LCP = `next/image` menunjuk **PNG sumber** di `public/art`, optimizer Next yang membuat AVIF/WebP; (b) komposit paket = `<picture>` AVIF/WebP hasil `optimize.mjs` lewat primitif `ZineImage` | `next/image` menolak `srcSet` manual; manifest sharp dipakai komponen yang tidak boleh menyentuh `next/image` |
| R7 | §7 "Setiap fase = satu commit. Rollback = `git revert` commit fase tersebut." | **Satu commit per task** (Task 0-31 ditambah Task 13b), bukan per fase. Gerbang fase tetap ada sebagai task sendiri (Task 10, 14, 18, 28, 31) | Commit per fase berarti satu commit berisi 10 task yang tidak bisa di-review atau di-revert terpisah. Rollback tetap bisa: revert rentang commit fase itu. Preferensi owner yang sudah tercatat: commit hanya file milik task-nya sendiri |
| R8 | §6 hanya mendaftar 11 bagian | Dua hal ditambah di luar referensi: (a) bagian **PROJECT UNIVERSE** di antara §6.7 dan §6.8 (`components/command-center/projects.tsx`), (b) panel **ACTIVE WORKFLOWS** digabung ke dalam MISSION LOG (§6.11) | Keduanya ada di halaman lama (`mission-control.tsx:300-350` dan `:353-396`) dan membawa perilaku nyata: taut proyek ke `/dock?q=`, dan daftar tujuan `queueRun` + tombol Pause/Run. Tanpa keduanya, §6 melanggar janjinya sendiri ("tidak ada kemampuan yang hilang") dan tombol QUEUE NEW RUN hanya memunculkan toast. Sama seperti §6.10-6.11: kalau owner mau persis seperti gambar, dua hal ini yang pertama dihapus |
| R9 | Tabel pemecahan §7 mendaftar `landing.tsx`, `dock.tsx`, `empire-shell.tsx`, `mission-control.tsx` | Satu file lagi dipecah: `site-nav.tsx` (181 baris) → `components/site-nav/{links.ts,mobile-menu.tsx,search-dialog.tsx,index.tsx}` di **Task 13b** | Aturan §7 bukan cuma tabel itu — gerbangnya berbunyi "setiap file komponen < 150 baris" dan berlaku untuk semua file. Tanpa Task 13b, Task 14 Step 1 pasti merah. Signature `SiteNav` tidak berubah, jadi pemakai (`landing/index.tsx`) tidak tersentuh |

## Peta file

Dibuat baru:

```
packages/types/package.json                 paket tipe, nol dependensi
packages/types/tsconfig.json                extends react-library? TIDAK — extends base.json
packages/types/eslint.config.mjs            base config
packages/types/src/index.ts                 semua tipe domain + ArtKey
packages/assets/package.json                manifest + vitest + sharp(dev)
packages/assets/tsconfig.json               extends base.json
packages/assets/eslint.config.mjs           base config
packages/assets/src/index.ts                ArtEntry + ARTWORK manifest
packages/assets/src/optimize.ts             WIDTHS, ART_SOURCES, outputNames() — murni, dites
packages/assets/scripts/optimize.mjs        wrapper node yang memanggil sharp
packages/assets/src/optimize.test.ts        tes outputNames + konsistensi manifest
packages/assets/references/01-landing.png … 06-shadow-command-center.png   (Task 2)
packages/assets/references/raw/*.png        4 vibe_images + shadow-command (Task 2, 19)
packages/assets/references/REFERENCES.md    tabel acuan → route
packages/ui/src/theme.css                   :root token + fallback font
packages/ui/src/base.css                    scrollbar + @layer components + keyframes + reduced-motion
packages/ui/src/probe.ts                    SOURCE_PROBE_CLASS — bukti @source memindai paket
packages/ui/src/icons/index.ts              11 ikon SVG dari components/zine.tsx
packages/ui/src/primitives/*.tsx            10 primitif (lihat Task 6)
packages/ui/src/composites/*.tsx            komposit (lihat Task 7-9, 22-24)
packages/ui/src/composites/kind-colors.ts   Record<EventKind,string> — pindah dari lib/data.ts
packages/ui/src/composites/module-glyphs.ts Record<string,string> — pindah dari mission-control.tsx:18
apps/web/src/lib/art.ts                     artSrc(key) — satu-satunya tempat /art/ disebut (Task 1)
apps/web/src/components/skip-link.tsx       skip link (Task 15)
apps/web/src/components/landing/*.tsx       hasil pecahan (Task 11)
apps/web/src/components/dock/*.tsx          hasil pecahan (Task 12)
apps/web/src/components/shell/*.tsx         hasil pecahan empire-shell (Task 13) + nav-items.ts (Task 21)
apps/web/src/components/site-nav/*          hasil pecahan site-nav (Task 13b)
apps/web/src/components/command-center/*    17 section + drawer + hook + orkestrator (Task 25-26)
apps/web/src/components/wordmark.tsx        SVG wordmark MOONWITNESS/SHADOW (Task 29)
apps/web/src/fonts/<keluarga>/*.ttf + OFL.txt  wajah display baru (Task 30)
apps/web/public/art/shadow-command.png      artwork hero baru (Task 19)
apps/web/public/art/*-{480,960,1440,1920}.{avif,webp}  hasil optimize.mjs (Task 19)
.verify/                                    screenshot verifikasi, gitignored
```

Dihapus:

```
packages/ui/src/button.tsx      Button indigo lama, nol pemakai (sudah diverifikasi)
packages/ui/src/card.tsx        Card/CardHeader/CardTitle/CardDescription/CardContent, nol pemakai
packages/ui/src/badge.tsx       Badge lama, nol pemakai
apps/web/src/components/zine.tsx        isinya pindah ke packages/ui/src/icons (Task 5)
apps/web/src/components/landing.tsx     jadi folder landing/ (Task 11)
apps/web/src/components/dock.tsx        jadi folder dock/ (Task 12)
apps/web/src/components/empire-shell.tsx jadi folder shell/ (Task 13)
apps/web/src/components/site-nav.tsx   jadi folder site-nav/ (Task 13b)
apps/web/src/components/mission-control.tsx diganti folder command-center/ (Task 27)
OrbitDiagram + orbitNodes + CSS .orbit-ring*/spin-slow  §D7 (Task 27)
apps/web/src/app/__cc-preview/  halaman pratinjau sementara, dihapus sebelum commit (Task 26)
```

`apps/web/src/components/site-nav.tsx` **tidak tetap ada**: ia 181 baris, jadi gerbang §7 ("setiap file komponen < 150 baris") juga berlaku padanya walaupun tabel §7 tidak mendaftar namanya. Task 13b memecahnya jadi `components/site-nav/{links.ts,mobile-menu.tsx,search-dialog.tsx,index.tsx}` tanpa mengubah signature `SiteNav`. Task 16 menambah `aria-current` di `site-nav/index.tsx` dan Task 29 mengganti brand-nya dengan `Wordmark`.

Dimodifikasi: `apps/web/package.json`, `apps/web/next.config.ts` (Task 1, 3, 17), `apps/web/src/app/globals.css` (Task 4), `apps/web/src/app/layout.tsx` (Task 15, 30), `apps/web/src/lib/data.ts` (Task 1, 20, 26), `apps/web/src/app/{page,dock/page,mission-control/page,shadow/page}.tsx`, `apps/web/src/components/shell/*` (Task 21, 29), `apps/web/src/components/site-nav/index.tsx` (Task 16, 29), `apps/web/src/components/landing/{crew,hero,index}.tsx` (Task 26, 29), `packages/ui/src/theme.css` (Task 30), `packages/ui/src/base.css` (Task 16, 27), `.gitignore` (Task 0), `pnpm-lock.yaml`, `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (catatan gerbang di Task 10, 14, 18, 28, 30, 31).

---

# FASE 0 — Baseline verifikasi

Fase 0 di spec (`git init` + commit baseline) **sudah selesai**: `d2af4e7`, spec di `f86f4cf`. Yang belum: menangkap tampilan "sebelum" sebagai pembanding fase 1 dan 2.

### Task 0: Tangkap baseline visual + siapkan direktori verifikasi

**Files:**
- Modify: `.gitignore` (tambah blok `.verify/`)
- Create: `.verify/phase0/` (12 file PNG, tidak di-commit)

**Interfaces:**
- Consumes: tidak ada.
- Produces: 12 screenshot pembanding bernama `.verify/phase0/<route>-<lebar>.png` yang dipakai gerbang Task 10, 11, 12, 13.

- [x] **Step 1: Tambah `.verify/` ke `.gitignore`**

Tambahkan di akhir `.gitignore`:

```gitignore

# verification artifacts (screenshot pembanding antar fase)
.verify/
```

- [x] **Step 2: Build produksi lalu jalankan server**

```bash
pnpm --filter @moonwitness/web build
pnpm --filter @moonwitness/web start -p 4317 &
```

Tunggu sampai log `Ready` muncul. Login dulu ke `/shadow` dengan `admin` / `admin123` supaya `/mission-control` dan `/dock` bisa dibuka (sesi disimpan di `localStorage` key `mw-session`).

- [x] **Step 3: Ambil 12 screenshot**

Untuk setiap pasangan route × viewport, set ukuran viewport lalu screenshot full page ke `.verify/phase0/`:

| route | viewport | nama file |
|---|---|---|
| `/` | 390x844 | `.verify/phase0/landing-390.png` |
| `/` | 768x1024 | `.verify/phase0/landing-768.png` |
| `/` | 1440x900 | `.verify/phase0/landing-1440.png` |
| `/shadow` | 390x844 | `.verify/phase0/shadow-390.png` |
| `/shadow` | 768x1024 | `.verify/phase0/shadow-768.png` |
| `/shadow` | 1440x900 | `.verify/phase0/shadow-1440.png` |
| `/mission-control` | 390x844 | `.verify/phase0/mission-control-390.png` |
| `/mission-control` | 768x1024 | `.verify/phase0/mission-control-768.png` |
| `/mission-control` | 1440x900 | `.verify/phase0/mission-control-1440.png` |
| `/dock` | 390x844 | `.verify/phase0/dock-390.png` |
| `/dock` | 768x1024 | `.verify/phase0/dock-768.png` |
| `/dock` | 1440x900 | `.verify/phase0/dock-1440.png` |

Catat juga angka yang jadi pembanding gerbang: `document.documentElement.scrollWidth` pada 390px untuk keempat route (harus ≤ 390).

> **Terekam 2026-11-11 (Task 0 selesai).** 12 screenshot ada di `.verify/phase0/`. `scrollWidth` @390px: `landing` 380, `shadow` 380, `mission-control` 380, `dock` 380 — semua ≤ 390. Di 768/1440 angka 758/1430 adalah lebar minus scrollbar, bukan overflow. Console: **0 error / 0 warning** di keempat route (dijaring lewat listener `console` + `pageerror`, bukan dibaca manual). Dua temuan baseline yang jadi pekerjaan fase 3: `document.querySelector("main")` **tidak ada** di `/` (landing) saja — `/shadow`, `/mission-control`, dan `/dock` sudah punya `<main>` (dua terakhir lewat `EmpireShell`), jadi Task 15 hanya perlu membungkus section landing; dan `/shadow` tidak punya `metadata` sendiri — `<title>`-nya masih judul default root layout ("Moonwitness — People. Places. Stories. Another side of reality."), itu urusan Task 18.

- [x] **Step 4: Matikan server**

```bash
netstat -ano | grep :4317
taskkill //PID <pid> //F
```

Jangan lanjut ke task berikutnya sebelum port 4317 benar-benar bebas.

- [x] **Step 5: Commit (hanya `.gitignore`)**

```bash
git add .gitignore
git commit -m "chore: abaikan artefak verifikasi .verify/"
```

Screenshot **tidak** di-commit — itu sebabnya `.verify/` ada di `.gitignore` sebelum file-nya dibuat.

---

# FASE 1 — Paket: types, assets, ui; apps/web jadi konsumen

Gerbang fase (§7): pipeline hijau, bukti `@source` benar-benar memindai paket, dan perbandingan visual 390x844 + 1440x900 sebelum vs sesudah **tanpa perbedaan yang tidak disengaja**.

### Task 1: Buat `packages/types`

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/eslint.config.mjs`
- Create: `packages/types/src/index.ts`
- Modify: `apps/web/next.config.ts` (tambah `@moonwitness/types` ke `transpilePackages`)
- Modify: `apps/web/package.json` (tambah dependency `@moonwitness/types`)
- Modify: `apps/web/src/lib/data.ts` (hapus deklarasi tipe, impor dari paket)
- Modify: `apps/web/src/components/dock.tsx`, `apps/web/src/components/landing.tsx`, `apps/web/src/components/mission-control.tsx`, `apps/web/src/components/empire-shell.tsx` (hanya baris `import type`)
- Modify: `pnpm-lock.yaml` (hasil `pnpm install`)

**Interfaces:**
- Consumes: bentuk tipe yang sudah ada di `apps/web/src/lib/data.ts` (baris 1-7, 47-62, 284-291, 373-381, 422-427, 457, 482, 490-499).
- Produces: ekspor `ArtKey`, `EraId`, `EventKind`, `Era`, `TimelineEvent`, `ModuleStat`, `Module`, `Project`, `Workflow`, `FeedItem`, `MissionAlert`, `Witness` dari `@moonwitness/types`. Task 3, 6, 7, 8, 9, 11, 12, 20, 21 semuanya mengimpor dari sini.

- [x] **Step 1: Tulis `packages/types/src/index.ts`**

Isi lengkap (tipe baru untuk dashboard **belum** ditambah di sini — itu Task 20, supaya fase 1 tetap netral secara visual):

```ts
/** Kunci artwork. Komponen UI tidak pernah menerima path mentah. */
export type ArtKey =
  | "hero-witness"
  | "city-shadow"
  | "crew-rooftop"
  | "signal-tunnel"
  | "shadow-command";

export type EraId = "origins" | "neon" | "fracture" | "rebuilding" | "expansions";

export type EventKind = "PROJECT" | "STORY" | "SIGNAL" | "WORLD" | "PEOPLE" | "RESEARCH";

export interface Era {
  id: EraId;
  name: string;
  years: string;
  tagline: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: string;
  era: EraId;
  title: string;
  excerpt: string;
  body: string;
  location: string;
  tags: string[];
  sources: number;
  notes: number;
  image: ArtKey;
  imagePosition?: string;
  related: string[];
}

export interface ModuleStat {
  label: string;
  value: number;
  color: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  stats: ModuleStat[];
}

export type ProjectStatus = "Active" | "Writing" | "Research" | "Planning";

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  color: string;
  image: ArtKey;
  imagePosition: string;
}

export type WorkflowStatus = "Running" | "Queued" | "Paused";

export interface Workflow {
  id: string;
  name: string;
  detail: string;
  status: WorkflowStatus;
}

export interface FeedItem {
  id: string;
  text: string;
  ago: string;
  color: string;
}

export type AlertLevel = "high" | "medium" | "low";

export interface MissionAlert {
  id: string;
  text: string;
  ago: string;
  level: AlertLevel;
}

export interface Witness {
  id: string;
  name: string;
  place: string;
  x: number;
  y: number;
  quote: string;
  signals: number;
}
```

- [x] **Step 2: Tulis `packages/types/package.json`**

```json
{
  "name": "@moonwitness/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "license": "UNLICENSED",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .turbo node_modules"
  },
  "devDependencies": {
    "@moonwitness/eslint-config": "workspace:*",
    "@moonwitness/typescript-config": "workspace:*",
    "eslint": "^9.39.0",
    "typescript": "^5.9.3"
  }
}
```

Tidak ada blok `dependencies` sama sekali — itu bukti §3.1 "nol dependensi runtime".

- [x] **Step 3: Tulis `packages/types/tsconfig.json` dan `packages/types/eslint.config.mjs`**

`tsconfig.json` (tidak perlu DOM, paket ini tidak punya JSX):

```json
{
  "extends": "@moonwitness/typescript-config/base.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

`eslint.config.mjs`:

```js
import { base } from "@moonwitness/eslint-config/base";

export default [...base];
```

Sebelum melanjutkan, pastikan nama ekspor itu benar: `grep -n "export const base" packages/eslint-config/base.js`. Kalau yang diekspor bukan `base`, sesuaikan import-nya — jangan menebak.

- [x] **Step 4: Wiring workspace + install**

Tambahkan ke `apps/web/package.json` di blok `dependencies`, urut alfabet sebelum `@moonwitness/core`:

```json
    "@moonwitness/types": "workspace:*",
```

Ubah `apps/web/next.config.ts` sehingga `transpilePackages` menjadi:

```ts
  transpilePackages: ["@moonwitness/ui", "@moonwitness/core", "@moonwitness/types"],
```

Jalankan:

```bash
pnpm install
```

Expected: lockfile berubah, `apps/web/node_modules/@moonwitness/types` adalah symlink ke `packages/types`. Cek dengan `ls -l apps/web/node_modules/@moonwitness/`.

- [x] **Step 5: `lib/data.ts` berhenti mendeklarasikan tipe**

Di `apps/web/src/lib/data.ts`:

1. Ganti seluruh bagian deklarasi tipe di kepala file dengan import + re-export berikut:

```ts
import type {
  Era,
  EventKind,
  FeedItem,
  MissionAlert,
  Module,
  Project,
  TimelineEvent,
  Witness,
  Workflow,
} from "@moonwitness/types";

export type {
  Era,
  EventKind,
  FeedItem,
  MissionAlert,
  Module,
  Project,
  TimelineEvent,
  Witness,
  Workflow,
};
```

Re-export ini disengaja dan sementara: supaya 4 file komponen yang mengimpor `type DockEvent`/`type Module` dari `@/lib/data` tidak perlu diubah di task yang sama. Task 11-13 menghapus re-export ini saat file-file itu dipecah.

2. Hapus deklarasi `export type Era = {...}` (baris 1-7), `export type DockEvent = {...}` (47-62), `export type Module = {...}` (284-291), `export type Project = {...}` (373-381), `export type Workflow = {...}` (422-427), `export type FeedItem = ...` (457), `export type Alert = ...` (482), `export type Witness = {...}` (490-499).

3. Ganti nama value + anotasi:

```ts
export const eras: Era[] = [ ... ];                 // isi tidak berubah
export const timelineEvents: TimelineEvent[] = [ ... ];  // dulu dockEvents
export const modules: Module[] = [ ... ];
export const projects: Project[] = [ ... ];
export const initialWorkflows: Workflow[] = [ ... ];
export const feedItems: FeedItem[] = [ ... ];
export const initialAlerts: MissionAlert[] = [ ... ];
export const witnesses: Witness[] = [ ... ];
```

Rename `dockEvents` → `timelineEvents` dilakukan mekanis di semua pemakai:

```bash
grep -rn "dockEvents" apps/web/src
```

Ganti setiap kemunculan. Sudah dipetakan, hanya ada tiga file: `lib/data.ts` (1 situs, definisinya), `components/dock.tsx` (7 situs: impor baris 8, lalu 112, 249, 255, 267, 305, 462), dan `components/landing.tsx` (2 situs: impor baris 6 dan 224). `mission-control.tsx` **tidak** memakainya — jangan mencari di sana. Setelah mengganti, grep yang sama harus menghasilkan **0 baris**.

4. `kindColors` berubah anotasi saja, isinya tetap:

```ts
export const kindColors: Record<EventKind, string> = { ... };
```

- [x] **Step 6: Ganti path artwork mentah jadi `ArtKey` di data**

Semua field `image:` di `timelineEvents` dan `projects` sekarang bertipe `ArtKey`, jadi 17 kemunculan path di `lib/data.ts` harus diganti:

| lama | baru |
|---|---|
| `"/art/hero-witness.png"` | `"hero-witness"` |
| `"/art/city-shadow.png"` | `"city-shadow"` |
| `"/art/crew-rooftop.png"` | `"crew-rooftop"` |
| `"/art/signal-tunnel.png"` | `"signal-tunnel"` |

Setelah mengganti, pastikan tidak ada path tersisa:

```bash
grep -n "/art/" apps/web/src/lib/data.ts
```

Expected: **0 baris**. Kalau masih ada, tipe belum ketat atau ada field yang terlewat.

Field `era:` di setiap event harus cocok dengan `EraId` (`"origins"`, `"neon"`, `"fracture"`, `"rebuilding"`, `"expansions"`) — kalau ada event yang `era`-nya string lain, `tsc` akan menolak dengan error tipe; perbaiki datanya, jangan longgarkan tipenya.

- [x] **Step 7: Perbaiki pemakai yang butuh path, bukan key**

Konsekuensi Step 6: lima tempat di tiga file yang memakai `ev.image` / `p.image` langsung sebagai `src` `next/image` sekarang memegang key. Tambah satu helper resolusi di **app** (bukan paket), `apps/web/src/lib/art.ts`:

```ts
import { ARTWORK } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/types";

/** next/image butuh path nyata; manifest memegangnya. */
export function artSrc(key: ArtKey): string {
  return ARTWORK[key].source;
}
```

`@moonwitness/assets` baru dibuat di Task 3, jadi **Step 7, 9-10 dijalankan setelah Task 3 selesai**; Step 8 justru sudah dikerjakan bersama Step 1-6 karena tidak bergantung pada Task 3 sama sekali — menundanya membuat Task 2 Step 5 mustahil hijau (`dock.tsx` masih mengimpor `DockEvent` yang sudah dihapus dari `lib/data.ts`). Urutan eksekusi yang benar: Task 1 Step 1-6 + Step 8, lalu Task 2, Task 3, lalu kembali ke Task 1 Step 7, 9-11.

Pemakai yang diubah (ganti `src={ev.image}` → `src={artSrc(ev.image)}` dan tambahkan `import { artSrc } from "@/lib/art";`):

- `apps/web/src/components/dock.tsx` — 3 tempat `src={ev.image}` (thumbnail kartu, baris daftar, panel detail)
- `apps/web/src/components/landing.tsx` — 1 tempat `src={ev.image}` (`ArchiveStrip`)
- `apps/web/src/components/mission-control.tsx` — 1 tempat `src={p.image}` (`Project Universe`)

Verifikasi: `grep -rn "\.image\b" apps/web/src --include=*.tsx | grep -v artSrc | grep -v imagePosition` → **0 baris**.

Path literal yang tidak lewat data (`landing.tsx` 36, 299, 400, 427, 478, 515; `dock.tsx` 283 dan blok ternary era di `dock.tsx`; `mission-control.tsx` 245; `shadow/page.tsx` 57) **dibiarkan apa adanya** di fase 1 — Task 17 yang menyeragamkannya. Ternary era itu menghasilkan string path, bukan `ArtKey`, jadi membungkusnya dengan `artSrc()` justru merusak gambar.

- [x] **Step 8: Update import type di komponen**

Ganti `import { ..., type DockEvent } from "@/lib/data"` menjadi `type TimelineEvent`, dan ganti semua pemakaian `DockEvent` di `dock.tsx` (signature `KindBadge`, `EventCard`, `EventDetail`, state `selected`) dengan `TimelineEvent`.

```bash
grep -rn "DockEvent" apps/web/src
```

Expected setelah selesai: **0 baris**.

- [x] **Step 9: Jalankan pipeline**

```bash
pnpm turbo run lint typecheck build
```

Expected: hijau. Error yang wajar muncul dan cara benar menanganinya:
- `Type '"2024-xx"' is not assignable to type 'EraId'` → data `era` tidak cocok; perbaiki datanya.
- `Cannot find module '@moonwitness/types'` → `pnpm install` belum dijalankan atau `transpilePackages` belum ditambah.

Yang **tidak** ditangkap `tsc`: pemakai `ev.image` yang belum dibungkus `artSrc()` tetap lolos karena `ArtKey` adalah union string dan `src` `next/image` menerima `string`. Gejalanya hanya terlihat di runtime — `src="hero-witness"` tanpa `/art/`, gambar rusak/404. Karena itu Step 7 tidak boleh dilewat dan hasilnya diverifikasi lewat screenshot Step 10, bukan lewat pipeline.

- [x] **Step 10: Bukti tidak ada perubahan tampilan**

Jalankan SHOT ke `.verify/phase1-task1/` (4 route × 3 viewport), lalu pakai empat bukti di "Cara membandingkan screenshot" — bukan diff pixel mentah.

> **Terekam 2026-11-11 (Task 1 selesai).** 12 screenshot ada di `.verify/phase1-task1/`. (1) `scrollWidth` @390px: landing 380, shadow 380, mission-control 380, dock 380 — **identik dengan baseline**. (2) Console dengan listener terpasang sebelum `goto`: **0 error / 0 warning** di keempat route, termasuk satu putaran yang mengulang alur login `admin` → `/dock` (counter agregat MCP sempat menampilkan 1 warning; putaran terkendali dengan listener membuktikan itu sisa hitungan halaman sebelumnya, bukan pesan dari build ini). (3) Paritas `src` hasil dekode `url=`: landing 14 gambar (`/art/hero-witness.png` ×3, `/art/crew-rooftop.png` ×5, `/art/city-shadow.png` ×4, `/art/signal-tunnel.png` ×2), shadow 1 (`city-shadow`), mission-control 5 (`city-shadow` ×2, `hero-witness` ×2, `crew-rooftop` ×1), dock 20 (`city-shadow` ×7, `crew-rooftop` ×6, `hero-witness` ×4, `signal-tunnel` ×3) — **tidak ada key telanjang, tidak ada gambar rusak**. (4) Diff pixel vs baseline memang besar di `dock-390/768` (11,5%) dan `shadow-768` (6,6%), tetapi diff *sesama capture build ini* juga 6,6% pada `shadow-768` dan 0,6% pada `dock-768`; pita yang berbeda ternyata gambar yang di baseline belum sempat termuat (hero `crew-rooftop` dan thumbnail event masih hitam). Kesimpulannya tidak ada perubahan tampilan — yang berubah adalah ketepatan waktu muat gambar saat capture, dan itu sebabnya diff pixel tidak dijadikan gerbang.

Matikan server (`netstat` + `taskkill`) sebelum commit.

- [x] **Step 11: Commit**

```bash
git add packages/types apps/web/package.json apps/web/next.config.ts apps/web/src/lib/data.ts apps/web/src/lib/art.ts apps/web/src/components pnpm-lock.yaml
git commit -m "feat(types): paket tipe domain, data app berhenti mendeklarasikan tipe"
```

`git status` sesudahnya harus bersih kecuali `.verify/` (yang memang diabaikan).

Catatan yang harus diketahui siapa pun yang `git bisect` lewat dua commit ini: **commit Task 1 tidak hijau sendirian.** `apps/web/src/lib/art.ts` mengimpor `ARTWORK` dari `@moonwitness/assets`, dan manifest itu baru ada di commit Task 3 — konsekuensi langsung dari rencana bahwa Step 7 dikerjakan setelah Task 3. Titik pertama yang pipeline-nya valid adalah commit Task 3. Memecah jadi tiga commit supaya tiap titik hijau juga tidak menyelesaikan apa pun: `pnpm-lock.yaml` adalah satu file untuk semua paket workspace, jadi commit tengah mana pun tetap punya lockfile yang tidak cocok dengan `package.json`-nya.

### Task 2: Buat `packages/assets` — referensi ternama

Task ini murni penataan file, tanpa logika. Manifest dan skrip optimasi ada di Task 3.

**Files:**
- Create: `packages/assets/package.json`
- Create: `packages/assets/tsconfig.json`
- Create: `packages/assets/eslint.config.mjs`
- Create: `packages/assets/src/index.ts` (sementara hanya `export {}` — diisi Task 3)
- Create: `packages/assets/references/01-landing.png` … `06-shadow-command-center.png` (salinan dari `ARTS/`)
- Create: `packages/assets/references/raw/` (4 salinan dari `vibe_images/`)
- Create: `packages/assets/references/REFERENCES.md`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `ARTS/*.png` (6 file) dan `vibe_images/*.png` (4 file) di root repo.
- Produces: nama referensi stabil `01-landing.png` … `06-shadow-command-center.png` yang dirujuk `ArtEntry.credit` (Task 3) dan fidelity check fase 4 (Task 26).

- [x] **Step 1: Buat struktur paket**

`packages/assets/package.json` — `sharp` dan `vitest` masuk devDependencies karena hanya dipakai skrip/tes, bukan runtime browser:

```json
{
  "name": "@moonwitness/assets",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "license": "UNLICENSED",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "optimize": "node scripts/optimize.mjs",
    "clean": "rm -rf .turbo node_modules coverage"
  },
  "dependencies": {
    "@moonwitness/types": "workspace:*"
  },
  "devDependencies": {
    "@moonwitness/eslint-config": "workspace:*",
    "@moonwitness/typescript-config": "workspace:*",
    "@types/node": "^24.10.0",
    "eslint": "^9.39.0",
    "sharp": "^0.35.5",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  }
}
```

`packages/assets/tsconfig.json`:

```json
{
  "extends": "@moonwitness/typescript-config/base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": ["src", "scripts"],
  "exclude": ["node_modules", "dist"]
}
```

`packages/assets/eslint.config.mjs`:

```js
import { base } from "@moonwitness/eslint-config/base";

export default [
  ...base,
  {
    ignores: ["references/**"],
  },
];
```

`packages/assets/src/index.ts` (placeholder Task 3 — satu-satunya isi sementara):

```ts
export {};
```

- [x] **Step 2: Salin dan rename referensi**

`ARTS/` **tidak disentuh dan tidak dipindah** (§D8) — ini salinan, jadi `git mv` tidak dipakai:

```bash
mkdir -p packages/assets/references/raw
cp "ARTS/image(1).png"                            packages/assets/references/01-landing.png
cp "ARTS/image (2).png"                           packages/assets/references/02-mission-control.png
cp "ARTS/image(3).png"                            packages/assets/references/03-shadow-login.png
cp "ARTS/image-gen-2(20261027-002736).png"        packages/assets/references/04-dock-timeline.png
cp "ARTS/image(2).png"                            packages/assets/references/05-style-ska-poster.png
cp "ARTS/image-gen-2.png"                         packages/assets/references/06-shadow-command-center.png
cp vibe_images/hero-witness_*.png                 packages/assets/references/raw/hero-witness.png
cp vibe_images/city-shadow_*.png                  packages/assets/references/raw/city-shadow.png
cp vibe_images/crew-rooftop_*.png                 packages/assets/references/raw/crew-rooftop.png
cp vibe_images/signal-tunnel_*.png                packages/assets/references/raw/signal-tunnel.png
```

Perhatikan dua file yang beda isi meski namanya mirip: `image (2).png` **dengan spasi** = acuan Mission Control lama; `image(2).png` **tanpa spasi** = poster ska (gaya saja). Salah salin di sini merusak seluruh acuan fidelity.

- [x] **Step 3: Verifikasi salinan identik**

```bash
md5sum "ARTS/image (2).png" packages/assets/references/02-mission-control.png
md5sum "ARTS/image(2).png"  packages/assets/references/05-style-ska-poster.png
```

Expected: tiap pasangan menghasilkan md5 yang **sama**, dan md5 `02-...` **berbeda** dari md5 `05-...`. Kalau sama, Step 2 salah kutip nama file.

- [x] **Step 4: Tulis `REFERENCES.md`**

`packages/assets/references/REFERENCES.md`:

```markdown
# Referensi visual

Salinan dari `ARTS/` di root repo dengan nama yang bisa dipakai sebagai acuan kerja.
`ARTS/` tetap utuh — itu tempat owner menaruh kiriman baru.

| File | Asal di `ARTS/` | Peran |
|---|---|---|
| `01-landing.png` | `image(1).png` | acuan layout `/` |
| `02-mission-control.png` | `image (2).png` (dengan spasi) | acuan lama `/mission-control`; digantikan `06` |
| `03-shadow-login.png` | `image(3).png` | acuan layout `/shadow` |
| `04-dock-timeline.png` | `image-gen-2(20261027-002736).png` | acuan layout `/dock` |
| `05-style-ska-poster.png` | `image(2).png` (tanpa spasi) | **gaya saja**, bukan layout |
| `06-shadow-command-center.png` | `image-gen-2.png` | acuan layout `/mission-control` yang baru |

`raw/` berisi PNG sumber hasil generate yang jadi input pipeline optimasi
(`hero-witness`, `city-shadow`, `crew-roftop`, `signal-tunnel`).

Enam file di atas diverifikasi berbeda satu sama lain (md5 unik), jadi tabel ini bukan tebakan.
```

- [x] **Step 5: Install + pipeline**

```bash
pnpm install
pnpm turbo run lint typecheck build
```

Expected: hijau. `packages/assets` belum punya test file, jadi `vitest run` akan gagal dengan "No test files found" — **karena itu script `test` belum boleh dijalankan di task ini**; Task 3 yang menambahkannya. Kalau turbo sudah menjalankan `test` untuk paket ini dan gagal, tambahkan `"test"` hanya setelah file tes ada (Task 3), atau jalankan `pnpm turbo run lint typecheck build` saja di step ini.

- [x] **Step 6: Commit**

```bash
git add packages/assets pnpm-lock.yaml
git commit -m "chore(assets): paket referensi artwork dengan nama stabil"
```

Catatan untuk owner: ~14 MB biner masuk git lokal. Sesuai §10 ini **tidak di-push**; kalau nanti repo mau di-push, `references/` butuh keputusan LFS terpisah.

---

### Task 3: Manifest artwork + pipeline optimasi sharp (TDD)

Ini satu-satunya bagian plan yang benar-benar TDD: ada logika murni (`outputNames`) dan ada invariant data (manifest lengkap) yang layak dites.

**Files:**
- Create: `packages/assets/src/optimize.ts`
- Create: `packages/assets/src/optimize.test.ts`
- Modify: `packages/assets/src/index.ts` (ganti `export {}` dengan manifest)
- Create: `packages/assets/scripts/optimize.mjs`
- Modify: `apps/web/next.config.ts` (tambah `@moonwitness/assets` ke `transpilePackages`)
- Modify: `apps/web/package.json` (tambah dependency `@moonwitness/assets`)
- Modify: `apps/web/public/art/` (output optimasi, hasil menjalankan skrip)

**Interfaces:**
- Consumes: `ArtKey` dari `@moonwitness/types` (Task 1); PNG sumber di `apps/web/public/art/*.png`.
- Produces:
  - `interface ArtEntry { source: string; src: string; srcSet: string; fallback: string; fallbackSrcSet: string; alt: string; position?: string; credit: string }`
  - `const ARTWORK: Record<ArtKey, ArtEntry>`
  - `const ART_WIDTHS: readonly [480, 960, 1440, 1920]`
  - `function outputNames(key: string, widths?: readonly number[]): string[]` → `["hero-witness-480.avif", "hero-witness-480.webp", ...]`
  - `const ART_SOURCES: Record<ArtKey, string>` → path PNG sumber relatif root repo
  - helper `artSrc(key: ArtKey): string` di `apps/web/src/lib/art.ts` (sudah dipakai Task 1 Step 7)

- [x] **Step 1: Tulis tes yang gagal — invariant manifest**

`packages/assets/src/optimize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ART_SOURCES, ART_WIDTHS, outputNames } from "./optimize";
import { ARTWORK } from "./index";
import type { ArtKey } from "@moonwitness/types";

const KEYS = Object.keys(ARTWORK) as ArtKey[];

describe("outputNames", () => {
  it("menghasilkan satu pasangan avif+webp per lebar, urut dari kecil", () => {
    expect(outputNames("hero-witness")).toEqual([
      "hero-witness-480.avif",
      "hero-witness-480.webp",
      "hero-witness-960.avif",
      "hero-witness-960.webp",
      "hero-witness-1440.avif",
      "hero-witness-1440.webp",
      "hero-witness-1920.avif",
      "hero-witness-1920.webp",
    ]);
  });

  it("menghormati daftar lebar kustom", () => {
    expect(outputNames("city-shadow", [960])).toEqual([
      "city-shadow-960.avif",
      "city-shadow-960.webp",
    ]);
  });
});

describe("ARTWORK manifest", () => {
  it("punya entri untuk setiap kunci artwork", () => {
    expect(KEYS.sort()).toEqual(
      ["city-shadow", "crew-rooftop", "hero-witness", "shadow-command", "signal-tunnel"].sort(),
    );
  });

  it("setiap entri merujuk srcSet yang memuat semua lebar", () => {
    for (const key of KEYS) {
      const entry = ARTWORK[key];
      for (const w of ART_WIDTHS) {
        expect(entry.srcSet).toContain(`${key}-${w}.avif ${w}w`);
        expect(entry.fallbackSrcSet).toContain(`${key}-${w}.webp ${w}w`);
      }
      expect(entry.source).toBe(`/art/${key}.png`);
      expect(entry.src).toBe(`/art/${key}-1440.avif`);
      expect(entry.fallback).toBe(`/art/${key}-1440.webp`);
      expect(entry.alt.length).toBeGreaterThan(20);
      expect(entry.credit).toMatch(/^0[1-6]-/);
    }
  });

  it("setiap kunci punya sumber PNG yang benar-benar ada di repo", async () => {
    const { existsSync } = await import("node:fs");
    for (const key of KEYS) {
      expect(existsSync(ART_SOURCES[key]), `${key} tidak ada di ${ART_SOURCES[key]}`).toBe(true);
    }
  });
});
```

Tes ketiga sengaja memeriksa filesystem: `shadow-command.png` belum ada sampai Task 19, jadi **tes ini akan merah sampai Task 19 selesai**. Itu benar dan disengaja — tulis ekspektasinya sekarang supaya artwork baru tidak bisa lupa dimasukkan pipeline. Supaya fase 1 tetap bisa hijau, tandai sementara:

```ts
  it.skip("setiap kunci punya sumber PNG yang benar-benar ada di repo", async () => {
```

dan hapus `.skip` di Task 19 Step 5. Catat di commit message Task 3 bahwa ada satu tes yang di-skip menunggu artwork.

- [x] **Step 2: Jalankan tes, pastikan gagal**

```bash
pnpm --filter @moonwitness/assets test
```

Expected: FAIL — `Cannot find module './optimize'` (dan `ARTWORK` belum ada karena `index.ts` masih `export {}`).

- [x] **Step 3: Tulis `packages/assets/src/optimize.ts`**

```ts
import type { ArtKey } from "@moonwitness/types";

export const ART_WIDTHS = [480, 960, 1440, 1920] as const;

/** Path PNG sumber relatif terhadap root repo. Input pipeline sharp. */
export const ART_SOURCES: Record<ArtKey, string> = {
  "hero-witness": "apps/web/public/art/hero-witness.png",
  "city-shadow": "apps/web/public/art/city-shadow.png",
  "crew-rooftop": "apps/web/public/art/crew-rooftop.png",
  "signal-tunnel": "apps/web/public/art/signal-tunnel.png",
  "shadow-command": "apps/web/public/art/shadow-command.png",
};

export const ART_OUT_DIR = "apps/web/public/art";

/** Nama file output, urut lebar menaik, avif lalu webp. */
export function outputNames(key: string, widths: readonly number[] = ART_WIDTHS): string[] {
  return widths.flatMap((w) => [`${key}-${w}.avif`, `${key}-${w}.webp`]);
}

export function srcSetFor(key: string, ext: "avif" | "webp", widths: readonly number[] = ART_WIDTHS) {
  return widths.map((w) => `/art/${key}-${w}.${ext} ${w}w`).join(", ");
}
```

- [x] **Step 4: Tulis `packages/assets/src/index.ts` (manifest)**

```ts
import type { ArtKey } from "@moonwitness/types";
import { srcSetFor } from "./optimize";

export interface ArtEntry {
  /** PNG sumber di public/art — inilah yang dipakai next/image di apps/web. */
  source: string;
  /** AVIF 1440w — src default untuk <picture> di packages/ui. */
  src: string;
  srcSet: string;
  /** WebP 1440w — fallback bila browser tidak mendukung AVIF. */
  fallback: string;
  fallbackSrcSet: string;
  alt: string;
  position?: string;
  /** Nama file di packages/assets/references/ yang jadi acuan visualnya. */
  credit: string;
}

function entry(key: ArtKey, alt: string, position: string | undefined, credit: string): ArtEntry {
  return {
    source: `/art/${key}.png`,
    src: `/art/${key}-1440.avif`,
    srcSet: srcSetFor(key, "avif"),
    fallback: `/art/${key}-1440.webp`,
    fallbackSrcSet: srcSetFor(key, "webp"),
    alt,
    position,
    credit,
  };
}

export const ARTWORK = {
  "hero-witness": entry(
    "hero-witness",
    "Saksi berjaket magenta menatap bulan di atas kota neon",
    "30% center",
    "01-landing.png",
  ),
  "city-shadow": entry(
    "city-shadow",
    "Kota malam diselimuti bayangan dan papan neon magenta",
    "50% 40%",
    "03-shadow-login.png",
  ),
  "crew-rooftop": entry(
    "crew-rooftop",
    "Kru bertudung berdiri di atap gedung menghadap bulan raksasa biru",
    "50% center",
    "02-mission-control.png",
  ),
  "signal-tunnel": entry(
    "signal-tunnel",
    "Sosok tunggal berjalan masuk ke terowongan bercahaya merah",
    "center",
    "04-dock-timeline.png",
  ),
  "shadow-command": entry(
    "shadow-command",
    "Pusat komando bayangan: layar data di ruangan gelap menghadap kota neon",
    "50% 35%",
    "06-shadow-command-center.png",
  ),
} satisfies Record<ArtKey, ArtEntry>;

export { ART_SOURCES, ART_WIDTHS, outputNames } from "./optimize";
```

`position` dan `credit` di atas adalah nilai awal yang wajar; Task 19 dan Task 26 boleh menyesuaikannya, tapi tes di Step 1 mengunci **bentuknya** (`credit` harus `0X-...`, `alt` > 20 karakter).

- [x] **Step 5: Tulis `packages/assets/scripts/optimize.mjs`**

Skrip ini dijalankan manual (§3.3), tidak masuk CI. Ia mengimpor konstanta dari source TypeScript lewat wrapper `.mjs` — karena Node tidak bisa mengimpor `.ts` langsung, path di sini ditulis literal dan **harus tetap sinkron** dengan `ART_SOURCES`:

```js
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SOURCES = {
  "hero-witness": "apps/web/public/art/hero-witness.png",
  "city-shadow": "apps/web/public/art/city-shadow.png",
  "crew-rooftop": "apps/web/public/art/crew-rooftop.png",
  "signal-tunnel": "apps/web/public/art/signal-tunnel.png",
  "shadow-command": "apps/web/public/art/shadow-command.png",
};
const OUT_DIR = path.join(ROOT, "apps/web/public/art");
const WIDTHS = [480, 960, 1440, 1920];
const QUALITY = 62;

let made = 0;
for (const [key, rel] of Object.entries(SOURCES)) {
  const input = path.join(ROOT, rel);
  if (!existsSync(input)) {
    console.warn(`[skip] ${key}: sumber tidak ada (${rel})`);
    continue;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const w of WIDTHS) {
    const base = sharp(input).resize({ width: w, withoutEnlargement: true }).rotate();
    await base.clone().avif({ quality: QUALITY }).toFile(path.join(OUT_DIR, `${key}-${w}.avif`));
    await base.clone().webp({ quality: QUALITY }).toFile(path.join(OUT_DIR, `${key}-${w}.webp`));
    made += 2;
  }
  console.log(`[ok] ${key}: ${WIDTHS.length * 2} file`);
}
console.log(`Selesai. ${made} file ditulis ke ${path.relative(ROOT, OUT_DIR)}`);
```

`[skip]` untuk `shadow-command` **diharapkan** sampai Task 19 menambah artwork-nya — skrip tidak boleh gagal hanya karena satu sumber belum ada.

- [x] **Step 6: Jalankan tes, pastikan hijau**

```bash
pnpm --filter @moonwitness/assets test
```

Expected: PASS 3 tes (dengan tes filesystem di-skip). Kalau `srcSet` gagal, periksa format `${w}w` dan pemisah `", "` — tes mengunci format itu karena `<picture>` membutuhkannya persis.

- [x] **Step 7: Wiring ke app**

Tambah ke `apps/web/package.json` `dependencies`:

```json
    "@moonwitness/assets": "workspace:*",
```

Ubah `apps/web/next.config.ts`:

```ts
  transpilePackages: [
    "@moonwitness/ui",
    "@moonwitness/core",
    "@moonwitness/types",
    "@moonwitness/assets",
  ],
```

Lalu buat `apps/web/src/lib/art.ts` persis seperti di Task 1 Step 7, jalankan `pnpm install`, dan teruskan Task 1 Step 7-11 bila belum.

- [x] **Step 8: Jalankan pipeline optimasi sekali**

```bash
pnpm --filter @moonwitness/assets optimize
```

Expected: 4 `[ok]` (hero-witness, city-shadow, crew-rooftop, signal-tunnel) × 8 file = **32 file**, plus 1 `[skip]` (shadow-command). Angka 32, bukan 40: `WIDTHS.length * 2 = 8` per kunci, dan satu kunci belum punya sumber. Lalu buktikan byte-nya turun:

```bash
ls -l apps/web/public/art/hero-witness.png apps/web/public/art/hero-witness-1440.avif apps/web/public/art/hero-witness-480.avif
```

Expected: `hero-witness.png` ±2.784.029 byte; `hero-witness-1440.avif` < 400.000 byte; `hero-witness-480.avif` < 120.000 byte. Kalau avif 1440 masih > 400 KB, turunkan `QUALITY` ke 55 dan jalankan ulang — angka 400 KB adalah target §5, bukan tebakan.

Terukur pada `QUALITY = 62`: `hero-witness-1440.avif` 166.534 byte, `hero-witness-480.avif` 26.236 byte, dan `*-1440.avif` terburuk se-manifest adalah `crew-rooftop-1440.avif` 277.199 byte — semua di bawah target, jadi tidak perlu menurunkan kualitas.

- [x] **Step 9: Pipeline + commit**

```bash
pnpm turbo run lint typecheck build && pnpm --filter @moonwitness/core test && pnpm --filter @moonwitness/assets test
git add packages/assets apps/web/package.json apps/web/next.config.ts apps/web/src/lib/art.ts apps/web/public/art pnpm-lock.yaml
git commit -m "feat(assets): manifest artwork + pipeline sharp avif/webp 480-1920"
```

Output `.avif`/`.webp` **ikut di-commit** supaya build tidak bergantung pada sharp di mesin lain. Total ±8 MB tambahan di git lokal; konsekuensi ini sudah dicatat di §10 spec.

### Task 4: Pindahkan CSS design system ke `packages/ui` + bukti `@source`

Ini gerbang paling penting di fase 1 (§7, §10). Kalau `@source` tidak memindai paket, semua utility yang hanya dipakai di dalam `packages/ui` hilang dan halaman tampil polos — dan build-nya tetap hijau. Jadi gerbangnya bukan "build sukses", tapi "kelas khusus ada di CSS hasil build", plus **kontrol negatif** yang membuktikan gerbang itu bisa gagal.

**Files:**
- Create: `packages/ui/src/theme.css`
- Create: `packages/ui/src/base.css`
- Modify: `packages/ui/package.json` (exports `./theme.css`, `./base.css`)
- Modify: `apps/web/src/app/globals.css` (408 baris → ±6 baris)
- Modify: `apps/web/src/app/layout.tsx` (tidak berubah kecuali bila font fallback perlu)

**Interfaces:**
- Consumes: `apps/web/src/app/globals.css` versi sekarang — 408 baris, sudah dibaca penuh.
- Produces: dua subpath export `@moonwitness/ui/theme.css` dan `@moonwitness/ui/base.css`; semua kelas `.font-brush`, `.halftone`, `.sticker*`, `.tape`, `.zine-card*`, `.btn-zine*`, `.brush-underline`, `.marquee-track`, `.orbit-ring*`, `.pulse-dot`, `.neon-flicker`, `.float-y`, `.rise-in`, `.zine-input` tersedia secara global. Task 6, 7, 8, 9 bergantung pada kelas-kelas ini.

- [ ] **Step 1: Tulis `packages/ui/src/theme.css`**

Salin `:root` dari `globals.css` baris 5-18 apa adanya, lalu tambah fallback font (supaya konsumen yang tidak memasang `next/font` tetap wajar — §4):

```css
:root {
  --ink: #0b0b10;
  --panel: #14141c;
  --panel-2: #1b1b26;
  --paper: #f4eede;
  --pink: #ff2d78;
  --blue: #2ea8ff;
  --yellow: #ffd21f;
  --purple: #a855f7;
  --red: #ff3b3b;
  --green: #3ddc84;
  --line: #2a2a38;
  --font-brush: "Permanent Marker", cursive;
  --font-hand: "Caveat", cursive;
  --font-mono: "Space Mono", ui-monospace, monospace;
  color-scheme: dark;
}
```

`next/font` menulis `--font-brush` dll. sebagai variable di class pada `<html>`. **Klaim lama di bawah ini sudah dibantah pengukuran** (lihat Step 9): `:root` dan class punya spesifisitas sama (0,1,0), jadi yang menentukan adalah urutan sumber — `theme.css` di-import belakangan dan **menang**, bukan kalah. Nama keluarga di sini tetap ditulis sebagai fallback supaya konsumen tanpa `next/font` masih wajar, dan efeknya baru aman karena Next 15.5 menamai `@font-face` dengan nama huruf asli; kalau nanti pindah ke Tailwind `@theme` atau next/font berganti skema penamaan, variabel ini harus ikut ditinjau.

- [ ] **Step 2: Tulis `packages/ui/src/base.css`**

Pindahkan dari `globals.css`:

| asal (`apps/web/src/app/globals.css`) | tujuan di `base.css` |
|---|---|
| baris 20-22 `html { scroll-behavior: smooth }` | bagian `document` (unlayered) |
| baris 24-29 `body { ... }` | bagian `document` (unlayered) |
| baris 31-34 `::selection` | bagian `document` (unlayered) |
| baris 36-56 scrollbar (`::-webkit-scrollbar*` + `* { scrollbar-width }`) | bagian `document` (unlayered) |
| baris 58-393 seluruh isi `@layer components { ... }` | bagian `components`, **tetap di dalam `@layer components`** |
| baris 395-408 `@media (prefers-reduced-motion: reduce)` | bagian akhir file, **unlayered** |

Kerangka file (isi lengkap = salinan baris-baris di atas, tanpa diubah satu deklarasi pun):

```css
/* ---- document ---- */
html {
  scroll-behavior: smooth;
}
body {
  background-color: var(--ink);
  color: #f5f3ee;
  font-family: var(--font-mono), ui-monospace, monospace;
  overflow-x: hidden;
}
::selection {
  background: var(--pink);
  color: #fff;
}
/* scrollbar: salin persis globals.css 36-56 */

/* Layered so Tailwind utilities (hidden, px-*, bg-*) can override these. */
@layer components {
  /* salin persis globals.css 60-392 */
}

/* Unlayered dengan sengaja: harus menang atas utility supaya animasi bisa dimatikan. */
@media (prefers-reduced-motion: reduce) {
  /* salin persis globals.css 396-407 */
}
```

Jangan "merapikan" deklarasi apa pun di task ini. Fase 1 harus netral secara visual; perubahan nilai CSS sekecil apa pun membuat gerbang Task 10 tidak bisa dipercaya.

- [ ] **Step 3: Kecilkan `globals.css`**

Isi lengkap `apps/web/src/app/globals.css` setelah task ini:

```css
@import "tailwindcss";

@source "../../../../packages/ui/src";

@import "@moonwitness/ui/theme.css";
@import "@moonwitness/ui/base.css";
```

Empat baris, tanpa sisa. Urutan wajib: `tailwindcss` dulu (ia yang mendeklarasikan urutan layer), baru theme, baru base.

- [ ] **Step 4: Daftarkan subpath export**

`packages/ui/package.json` — ganti blok `exports` menjadi:

```json
  "exports": {
    ".": "./src/index.ts",
    "./icons": "./src/icons/index.ts",
    "./theme.css": "./src/theme.css",
    "./base.css": "./src/base.css"
  },
```

`./icons` belum ada sampai Task 5 — mendaftarkannya lebih dulu tidak merusak build karena tidak ada yang mengimpornya, dan Task 5 tinggal mengisi file-nya.

- [ ] **Step 5: Tanam kelas bukti di dalam paket**

`@source` hanya terbukti kalau ada kelas Tailwind yang **hanya** muncul di `packages/ui`. Buka `packages/ui/src/index.ts` dan, sementara waktu, tambahkan konstanta bukti:

```ts
/** Kelas bukti untuk gerbang @source (Task 4 Step 6-8). Dipakai ZineBadge di Task 6. */
export const SOURCE_PROBE_CLASS = "tracking-[0.18em]";
```

Pastikan string `0.18em` tidak ada di tempat lain di repo:

```bash
grep -rn "0\.18em" apps/web/src packages/*/src
```

Expected: **hanya** satu baris, yaitu `packages/ui/src/index.ts`. (`strokeWidth="0.18"` di `landing.tsx` tidak cocok karena polanya memakai `em`.)

- [ ] **Step 6: Bukti positif — build lalu grep CSS**

```bash
pnpm --filter @moonwitness/web build
ls apps/web/.next/static/css/
grep -o '\.18em' apps/web/.next/static/css/*.css
```

Expected: minimal satu kecocokan `.18em` (Tailwind memancarkan `.tracking-\[0\.18em\]{letter-spacing:0.18em}`; minifier bisa menulis `.18em`). Kalau tidak ada kecocokan, `@source` tidak memindai paket — **berhenti dan perbaiki dulu**, jangan lanjut ke Step 7.

- [ ] **Step 7: Kontrol negatif — buktikan gerbang ini bisa gagal**

Ini langkah yang membedakan "gerbang yang benar-benar memeriksa" dari "gerbang yang selalu hijau".

```bash
sed -i 's|^@source "../../../../packages/ui/src";|/* @source dinonaktifkan untuk kontrol negatif */|' apps/web/src/app/globals.css
pnpm --filter @moonwitness/web build
grep -c '\.18em' apps/web/.next/static/css/*.css
```

Expected: **0**. Kalau masih ≥ 1, gerbang di Step 6 tidak membuktikan apa-apa (mungkin kelas itu ikut ter-generate dari tempat lain) — cari tahu dulu sebelum melanjutkan.

- [ ] **Step 8: Kembalikan `@source`**

```bash
sed -i 's|^/\* @source dinonaktifkan untuk kontrol negatif \*/|@source "../../../../packages/ui/src";|' apps/web/src/app/globals.css
grep -n "@source" apps/web/src/app/globals.css
```

Expected: baris `@source "../../../../packages/ui/src";` kembali ada. Lalu build ulang dan ulangi grep positif Step 6 (harus ≥ 1).

- [x] **Step 9: Bukti tidak ada perubahan tampilan**

Gerbangnya empat bukti berurutan dari bagian "Cara membandingkan screenshot", **bukan** diff pixel mentah vs `.verify/phase0/` (sudah terbukti bukan gerbang sah). Task 4 murni memindahkan CSS, jadi yang harus sama adalah *computed style*, bukan susunan DOM.

Yang diukur (build produksi `next start -p 4317`, viewport 390×844 lalu 1280×900):

1. **Tidak ada overflow horizontal.** `document.documentElement.scrollWidth` = **380** di `/`, `/dock`, `/mission-control`, `/shadow` (clientWidth juga 380) — sama persis dengan angka Task 1.
2. **Console bersih.** Listener `console`/`pageerror`/`requestfailed`/`response>=400` yang dipasang sebelum navigasi: **0 error, 0 warning, 0 request gagal** di keempat rute, termasuk replay login → dock. Catatan: log agregat MCP kadang masih menampilkan dua `WARNING` "resource … was preloaded using link preload but not used" untuk `/art/crew-rooftop.png` dan `/art/city-shadow.png`. Itu **bukan** regresi Task 4 — penyebabnya prop `priority` pada `next/image` di kode yang tidak disentuh task ini, dan tidak muncul sama sekali saat listener dipasang sendiri. Layak dicatat sebagai kandidat perbaikan di Task 17 (perf), bukan di sini.
3. **Paritas computed style** (ini inti bukti migrasi):
   - `body` background `rgb(11, 11, 16)` = `--ink` ✓ dan `scrollbar-color: rgb(255, 45, 120) rgb(11, 11, 16)` (thumb pink, aturan unlayered di `base.css`) ✓
   - `.btn-zine` `clip-path` = polygon 33 titik utuh, `font-family` brush ✓; `.zine-input` border `rgb(42, 42, 56)` = `--line` ✓
   - `.zine-card-rough` `box-shadow: rgba(0,0,0,0.55) 6px 6px 0` + `outline: dashed rgba(244,238,222,0.25)` ✓
   - `.marquee-track` `animation: marquee 28s` `running`; `.float-y` 5s; `.pulse-dot` 1.8s ✓
   - `html { scroll-behavior: smooth }` ✓
4. **Screenshot mata** di `.verify/phase1-task4/` (`p4-landing-1280/390`, `p4-dock-1280/390`, `p4-shadow-1280/390`, `p4-mission-1280`, `p4-mission-control-390`), diambil dengan resep deterministik: scroll penuh dulu (memicu lazy load), kembali ke atas, tunggu, lalu suntik `*{animation-play-state:paused!important;transition:none!important}` sebelum `fullPage`.

Reduced-motion diuji lewat `page.emulateMedia({ reducedMotion: 'reduce' })`, bukan DevTools manual: `.marquee-track`/`.float-y`/`.pulse-dot`/`.rise-in` jadi `animation-name: none`, `duration 0s`, `transition 0s`, `html scroll-behavior: auto`; setelah `no-preference` + reload, marquee kembali `marquee/28s`. Berarti blok `@media` tetap **unlayered** — Global Constraints tidak dilanggar.

Dua hal yang harus diketahui siapa pun yang mengulang langkah ini:

- **Root screenshot Playwright MCP** bukan workspace. `page.screenshot({ path: "nama.png" })` (relatif) mendarat di `Z:\Qoder\.qoder-versions\0.5.7\`, jadi salin manual ke `.verify/phase1-task4/` setelahnya. Parameter `filename` tool tetap ditolak untuk path repo.
- **Font: klaim Step 3 salah arah, meski hasilnya tidak merusak.** Teks aslinya "next/font menulis `--font-brush` sebagai class-scoped variable di `<html>`, jadi nilai di `theme.css` hanya berlaku bila class font tidak terpasang." Kenyataan terukur: `theme.css` memakai `:root` (spesifisitas 0,1,0) dan next/font memakai class (0,1,0 juga) — seri, jadi **yang menang adalah urutan sumber**, dan `theme.css` datang belakangan (posisi byte 52246 vs 613 di CSS hasil build). Nilai yang berlaku = `"Permanent Marker", cursive`, bukan `"Permanent Marker","Permanent Marker Fallback"`. Ini **bukan** regresi hanya karena Next 15.5 menamai `@font-face` dengan nama huruf asli (`font-family:Permanent Marker`), jadi keluarga yang di-merge tetap ter-resolve. Buktinya diukur, bukan disimpulkan: lebar teks `Moonwitness Story Network` pada 40px = **563.09px** untuk `.font-brush`, sama persis dengan `'"Permanent Marker"'` (563.09) dan jauh dari `cursive` (530.97); `document.fonts.check` true untuk ketiga huruf. Yang hilang hanyalah fallback size-adjusted next/font selama webfont loading — perbedaan metriknya 0.43px dari 563px (~0.08%). Kalau nanti Fase 5 ingin mengembalikan fallback itu, caranya bukan memindah variabel ke `:root`, tapi menaruh `theme.css` di `@layer theme` atau menamai variabelnya beda.

Matikan server (bukti: `netstat -ano | grep :4317 | grep LISTENING` kosong). Pelajaran dari percobaan pertama: `EADDRINUSE` membuat `pnpm start` keluar dengan `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` **tanpa** meninggalkan listener, jadi gejalanya terlihat seperti "port bebas tapi server menolak start". Cek `netstat` dulu, baru start.

- [x] **Step 10: Pipeline + commit**

```bash
pnpm turbo run lint typecheck build
git add packages/ui/package.json packages/ui/src/theme.css packages/ui/src/base.css packages/ui/src/index.ts apps/web/src/app/globals.css
git commit -m "refactor(ui): pindahkan token + base CSS design system ke packages/ui"
```

Hasil pipeline: **11/11 task sukses** (6 cached), tanpa error lint/typecheck/build.

**Deviasi dari perintah `git add` di atas, dan kenapa.** Di working tree, `globals.css` bukan lagi "empat baris import": ia masih menggenggam blok `.duo-img`/`.duo-tint`/`.duo-halftone`/`.marginalia` yang **bukan** bagian task ini dan belum pernah di-commit (di HEAD blok itu tidak ada — `git grep "duo-img" HEAD -- apps packages` kosong). Menjalankan `git add apps/web/src/app/globals.css` apa adanya akan menyeret WIP orang lain ke commit Task 4. Yang dilakukan: versi commit (empat baris import, tanpa blok duotone) ditulis ke file sementara, lalu di-stage dengan `git hash-object -w` + `git update-index --cacheinfo 100644,<blob>,apps/web/src/app/globals.css`, sehingga `git status` menampilkan `MM` — index bersih milik task ini, working tree tetap menyimpan WIP pemiliknya apa adanya. `landing.tsx` tetap ` M` dan tidak masuk index. Bukti sebelum commit: `git diff --cached --stat` = tepat 5 file, dan `git diff --cached | grep -c "duo-img"` = **0**.

Konsekuensi yang perlu dicatat: **screenshot Step 9 diambil dari working tree**, jadi di dalamnya artwork sudah memakai perlakuan duotone. Tidak masalah untuk gerbang ini (gerbangnya computed style + aturan yang dipindah, yang sudah dibandingkan secara ternormalisasi dan identik kecuali tiga fallback font yang memang ditambahkan), tapi jangan pakai screenshot itu sebagai baseline untuk task yang mengasumsikan artwork full-color.

---

### Task 5: Pindahkan ikon ke `packages/ui/src/icons`

**Files:**
- Create: `packages/ui/src/icons/index.tsx` (salinan `apps/web/src/components/zine.tsx`, 123 baris, 11 ikon)
- Modify: `packages/ui/package.json` (subpath `./icons` menunjuk ke file `.tsx`)
- Modify: `apps/web/src/components/{landing,dock,mission-control,empire-shell,site-nav}.tsx` (baris import saja)
- Modify: `apps/web/src/app/shadow/page.tsx` (baris import saja)
- Delete: `apps/web/src/components/zine.tsx`

> **Cacat plan yang sudah diperbaiki saat eksekusi.** Versi awal task ini menulis tujuan sebagai `icons/index.ts`. Itu tidak bisa jalan: isinya JSX, dan TypeScript mem-parse `.ts` tanpa mode JSX, jadi `pnpm --filter @moonwitness/ui typecheck` gagal dengan 20+ `error TS1005: '>' expected` di baris `<svg ...>`. Nama file yang benar `index.tsx`, dan blok `exports` ikut menunjuk ke sana. Semua rujukan `icons/index.ts` di task lain (Task 6-9, 11-13, 22-24) dibaca sebagai `icons/index.tsx`.

**Interfaces:**
- Consumes: `apps/web/src/components/zine.tsx` — `Crown`, `Bolt`, `Smiley`, `Star4`, `Splatter`, `ArrowRight`, `PlayIcon`, `PauseIcon`, `GlobeIcon`, `EyeIcon`, `SearchIcon`, semuanya `(props: SVGProps<SVGSVGElement>) => JSX`.
- Produces: `import { Crown, ArrowRight } from "@moonwitness/ui/icons"` — subpath ini dipakai Task 6-9, 11-13, 22-24.

- [x] **Step 1: Salin isi `zine.tsx` ke `packages/ui/src/icons/index.tsx`**

Isi file = persis 123 baris `apps/web/src/components/zine.tsx`, tanpa perubahan apa pun (semua ikon sudah `aria-hidden` dan memakai `currentColor`, jadi sudah aman untuk paket). Bukti: `diff apps/web/src/components/zine.tsx packages/ui/src/icons/index.tsx` kosong, dan `git` mengenalinya sebagai rename 100% (`R apps/web/src/components/zine.tsx -> packages/ui/src/icons/index.tsx`). Ekstensi `.tsx`, bukan `.ts` — lihat catatan cacat plan di atas.

- [x] **Step 2: Ganti import di 6 file app**

Setiap `from "./zine"` atau `from "@/components/zine"` jadi `from "@moonwitness/ui/icons"`:

```bash
grep -rn "components/zine\|\"./zine\"" apps/web/src
```

Enam situs yang sudah dipetakan: `app/shadow/page.tsx`, `components/dock.tsx`, `components/empire-shell.tsx`, `components/landing.tsx`, `components/mission-control.tsx`, `components/site-nav.tsx`. Setelah mengganti, jalankan grep yang sama dan pastikan hasilnya **0 baris**.

- [x] **Step 3: Hapus file lama**

```bash
git rm apps/web/src/components/zine.tsx
```

Penghapusan ini diminta eksplisit oleh spec (§3.2: ikon pindah ke paket). Jangan hapus file lain di task ini. Sudah: `git rm -q` dan `git status` hanya menampilkan rename, tidak ada penghapusan lain.

- [x] **Step 4: Pipeline + bukti visual**

```bash
pnpm turbo run lint typecheck build
```

Lalu bukti tampilan dengan gerbang empat bukti (bukan diff pixel vs `.verify/phase0/`). Ikon yang hilang = `"use client"` atau transpile paket bermasalah — periksa `transpilePackages` memuat `@moonwitness/ui`.

Terukur di `next start -p 4317`, viewport 1280×900, dengan listener `console`/`pageerror` dipasang sebelum navigasi:

| rute | `<svg>` | `viewBox` mahkota `0 0 48 32` | splatter `0 0 24 32` | star4 `0 0 32 32` | smiley `0 0 100 100` | 24×24 | error+warning | scrollWidth |
|---|---|---|---|---|---|---|---|---|
| `/` | 40 | 6 | 1 | 2 | 4 | 26 | 0 | 1270 |
| `/dock` | 35 | 5 | 0 | 1 | 1 | 28 | 0 | 1270 |
| `/mission-control` | 50 | 15 | 5 | 1 | 1 | 27 | 0 | 1270 |
| `/shadow` | 10 | 3 | 0 | 2 | 1 | 4 | 0 | 1280 |

Kelima bentuk viewBox ikon muncul di tempat yang sama seperti sebelumnya, nol konsol, nol overflow. Satu-satunya `<svg>` berukuran nol di `/` adalah tombol menu mobile (`parent: .rounded-md.p-2.text-zinc-200.lg:hidden`) — memang disembunyikan di 1280px, bukan ikon rusak. Dua viewBox asing (`0 0 100 70` di `/`, `0 0 200 200` di `/mission-control`) adalah diagram orbit/peta inline milik app, bukan bagian set ikon.

Screenshot tersimpan di `.verify/phase1-task5/` (`p5-landing-1280.png`, `p5-shadow-1280.png`, `p5-dock-1280.png`), diambil dengan resep deterministik yang sama seperti Task 4 Step 9.

Matikan server (sudah: `netstat` untuk 4317 kosong), lalu commit:

```bash
git add packages/ui/src/icons apps/web/src
git commit -m "refactor(ui): ikon SVG pindah ke @moonwitness/ui/icons"
```

**Jangan jalankan `git add apps/web/src` apa adanya.** Di dalamnya ada `globals.css` yang masih menggenggam blok duotone/marginalia milik WIP orang lain dan `landing.tsx` yang punya WIP sendiri. Yang di-stage: 5 file import bersih + `packages/ui/{package.json,src/icons/index.tsx}` + penghapusan `zine.tsx`, sementara `landing.tsx` di-stage sebagian lewat `git show HEAD:... | sed 's|from "./zine"|...|'` → `git hash-object -w` → `git update-index --cacheinfo`. Bukti sebelum commit: `git diff --cached` hanya berisi 6 baris import + rename + satu baris exports, dan `git status` menampilkan `MM apps/web/src/components/landing.tsx` serta ` M apps/web/src/app/globals.css` (WIP tetap tidak tersentuh).

### Task 6: Primitif `packages/ui` + hapus komponen scaffold lama

Primitif dibuat **dan langsung dipakai** di tempat yang class string-nya memang terduplikasi, supaya tidak jadi scaffold mati. Jumlah kemunculan yang jadi dasar (hasil `grep -ro` di `apps/web/src`): `zine-card` 25, `zine-card-rough` 17, `sticker` 17, `btn-zine` 14, `font-brush` 60, `zine-input` 5, `grain` 5, `tape` 4, `halftone` 3, `brush-underline` 2, `marquee` 1.

`font-brush` dan `brush-underline` **tidak** dibuatkan komponen: keduanya utility tipografi yang dipakai inline di 60+ tempat, dan membungkusnya hanya menambah DOM tanpa mengurangi duplikasi. Keduanya tetap hidup sebagai kelas CSS di `base.css`.

**Files:**
- Create: `packages/ui/src/primitives/zine-button.tsx`
- Create: `packages/ui/src/primitives/sticker.tsx`
- Create: `packages/ui/src/primitives/tape.tsx`
- Create: `packages/ui/src/primitives/zine-card.tsx` (berisi `ZineCard` + `ZineCardRough`)
- Create: `packages/ui/src/primitives/zine-badge.tsx`
- Create: `packages/ui/src/primitives/zine-input.tsx`
- Create: `packages/ui/src/primitives/zine-image.tsx`
- Create: `packages/ui/src/primitives/marquee.tsx`
- Create: `packages/ui/src/primitives/texture.tsx` (berisi `Halftone` + `Grain`)
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json` (tambah dependencies `@moonwitness/types`, `@moonwitness/assets`)
- Delete: `packages/ui/src/button.tsx`, `packages/ui/src/card.tsx`, `packages/ui/src/badge.tsx`
- Modify: pemakai di app (lihat Step 9)

**Interfaces:**
- Consumes: `cn` dari `packages/ui/src/cn.ts` (sudah ada), `ARTWORK`/`ArtEntry` dari `@moonwitness/assets`, `ArtKey` dari `@moonwitness/types`.
- Produces (dipakai Task 7-9, 11-13, 22-25):

```ts
type ZineTone = "pink" | "yellow" | "blue" | "paper";
function ZineButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ZineTone }): JSX.Element

type StickerTone = "paper" | "pink" | "yellow" | "blue" | "black";
function Sticker(props: HTMLAttributes<HTMLSpanElement> & { tone?: StickerTone }): JSX.Element

function Tape(props: HTMLAttributes<HTMLSpanElement>): JSX.Element
function ZineCard(props: HTMLAttributes<HTMLDivElement>): JSX.Element
function ZineCardRough(props: HTMLAttributes<HTMLDivElement>): JSX.Element
function ZineBadge(props: HTMLAttributes<HTMLSpanElement> & { color: string; dark?: boolean }): JSX.Element
function ZineInput(props: InputHTMLAttributes<HTMLInputElement>): JSX.Element
function ZineImage(props: { art: ArtKey; alt?: string; className?: string; sizes?: string; eager?: boolean }): JSX.Element
function Marquee(props: HTMLAttributes<HTMLDivElement> & { children: ReactNode }): JSX.Element
function Halftone(props: HTMLAttributes<HTMLDivElement> & { tone?: "white" | "pink" }): JSX.Element
function Grain(props: HTMLAttributes<HTMLSpanElement>): JSX.Element
```

Tidak ada `ZineLink`, walaupun 8 dari 14 pemakai `btn-zine` adalah `<Link>`. Alasannya: paket tidak boleh mengimpor `next/link`, dan `<a>` polos kehilangan client-side navigation. Pemakai itu tetap menulis `<Link className="btn-zine ...">` di app — kelas CSS-nya tersedia global dari `base.css`, jadi tidak ada yang hilang.

- [x] **Step 1: Tambah dependensi paket**

`packages/ui/package.json` — ganti blok `dependencies`:

```json
  "dependencies": {
    "@moonwitness/assets": "workspace:*",
    "@moonwitness/types": "workspace:*",
    "clsx": "^2.1.1"
  },
```

lalu `pnpm install`.

- [x] **Step 2: `zine-button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

export type ZineTone = "pink" | "yellow" | "blue" | "paper";

const TONE_CLASS: Record<ZineTone, string> = {
  pink: "",
  yellow: "btn-yellow",
  blue: "btn-blue",
  paper: "btn-paper",
};

export interface ZineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ZineTone;
}

export function ZineButton({ tone = "pink", className, type = "button", ...props }: ZineButtonProps) {
  return (
    <button
      type={type}
      className={cn("btn-zine", TONE_CLASS[tone], className)}
      {...props}
    />
  );
}
```

- [x] **Step 3: `sticker.tsx`, `tape.tsx`, `zine-card.tsx`, `texture.tsx`**

```tsx
// sticker.tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export type StickerTone = "paper" | "pink" | "yellow" | "blue" | "black";

const TONE_CLASS: Record<StickerTone, string> = {
  paper: "",
  pink: "sticker-pink",
  yellow: "sticker-yellow",
  blue: "sticker-blue",
  black: "sticker-black",
};

export interface StickerProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StickerTone;
}

export function Sticker({ tone = "paper", className, ...props }: StickerProps) {
  return <span className={cn("sticker", TONE_CLASS[tone], className)} {...props} />;
}
```

```tsx
// tape.tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

/** Dekorasi selotip. Parent harus `relative`. */
export function Tape({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden className={cn("tape", className)} {...props} />;
}
```

```tsx
// zine-card.tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function ZineCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("zine-card", className)} {...props} />;
}

export function ZineCardRough({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("zine-card-rough", className)} {...props} />;
}
```

```tsx
// texture.tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export interface HalftoneProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "white" | "pink";
}

export function Halftone({ tone = "white", className, ...props }: HalftoneProps) {
  return (
    <div
      aria-hidden
      className={cn(tone === "pink" ? "halftone-pink" : "halftone", className)}
      {...props}
    />
  );
}

/** Lapisan noise. Parent harus `relative`; span ini menutupi seluruh parent. */
export function Grain({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      className={cn("grain pointer-events-none absolute inset-0", className)}
      {...props}
    />
  );
}
```

- [x] **Step 4: `zine-badge.tsx` dan `zine-input.tsx`**

```tsx
// zine-badge.tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export interface ZineBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color: string;
  /** true bila warna latarnya terang sehingga teks harus gelap. */
  dark?: boolean;
}

export function ZineBadge({ color, dark = false, className, style, ...props }: ZineBadgeProps) {
  return (
    <span
      className={cn("px-2 py-0.5 font-brush text-[10px]", className)}
      style={{ background: color, color: dark ? "#111" : "#fff", ...style }}
      {...props}
    />
  );
}
```

```tsx
// zine-input.tsx
import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export function ZineInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("zine-input", className)} {...props} />;
}
```

- [x] **Step 5: `zine-image.tsx`**

```tsx
import { ARTWORK } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/types";
import { cn } from "../cn";

export interface ZineImageProps {
  art: ArtKey;
  /** Menggantikan alt dari manifest bila penempatannya butuh teks lain. */
  alt?: string;
  className?: string;
  /** Atribut sizes CSS; wajib diisi bila lebar tampil berubah antar breakpoint. */
  sizes?: string;
  eager?: boolean;
}

/** Gambar non-LCP untuk komposit paket: <picture> avif + webp dari manifest. */
export function ZineImage({ art, alt, className, sizes = "100vw", eager = false }: ZineImageProps) {
  const entry = ARTWORK[art];
  return (
    <picture>
      <source type="image/avif" srcSet={entry.srcSet} sizes={sizes} />
      <img
        src={entry.fallback}
        srcSet={entry.fallbackSrcSet}
        sizes={sizes}
        alt={alt ?? entry.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: entry.position ?? "center" }}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    </picture>
  );
}
```

Parent pemakai wajib `relative` dengan tinggi pasti — persis pola `next/image fill` yang digantikannya.

- [x] **Step 6: `marquee.tsx`**

Markup landing sekarang (baris 361-384) menduplikasi isi dua kali karena keyframe menggeser `-50%`. Komponen ini mengambil alih duplikasi itu; kelas teks (`font-brush text-lg text-white`) tetap di container luar karena `font-family`/`color` diwarisi ke bawah.

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Jalur berjalan. Isi dirender dua kali karena animasi menggeser -50%. */
export function Marquee({ children, className, ...props }: MarqueeProps) {
  return (
    <div aria-hidden className={cn("overflow-hidden", className)} {...props}>
      <div className="marquee-track flex w-max gap-8">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex gap-8">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Pemakai kedua muncul di fase 4 (strip "PRIVATE // CREATE · CURATE · DEPLOY" di hero Shadow Command Center, §6.1) — itu sebabnya komponen ini layak ada meski sekarang hanya satu pemakai.

- [x] **Step 7: Konstanta bukti + `packages/ui/src/index.ts`**

Buat `packages/ui/src/probe.ts`:

```ts
/** Kelas bukti gerbang @source: hanya ada di paket ini, harus muncul di CSS hasil build. */
export const SOURCE_PROBE_CLASS = "tracking-[0.18em]";
```

Pakai di `zine-badge.tsx` supaya konstanta itu benar-benar ter-generate (bukan sekadar dideklarasikan):

```tsx
import { SOURCE_PROBE_CLASS } from "../probe";
// ...
      className={cn(SOURCE_PROBE_CLASS, "px-2 py-0.5 font-brush text-[10px]", className)}
```

Isi lengkap `packages/ui/src/index.ts`:

```ts
export { cn } from "./cn";
export { SOURCE_PROBE_CLASS } from "./probe";

export { ZineButton, type ZineButtonProps, type ZineTone } from "./primitives/zine-button";
export { Sticker, type StickerProps, type StickerTone } from "./primitives/sticker";
export { Tape } from "./primitives/tape";
export { ZineCard, ZineCardRough } from "./primitives/zine-card";
export { ZineBadge, type ZineBadgeProps } from "./primitives/zine-badge";
export { ZineInput } from "./primitives/zine-input";
export { ZineImage, type ZineImageProps } from "./primitives/zine-image";
export { Marquee, type MarqueeProps } from "./primitives/marquee";
export { Halftone, Grain, type HalftoneProps } from "./primitives/texture";
```

Komposit ditambahkan ke file ini di Task 7-9 (file ditambah, bukan ditulis ulang).

- [x] **Step 8: Hapus komponen scaffold lama**

Sudah diverifikasi nol pemakai di seluruh repo. Pastikan ulang sebelum menghapus:

```bash
grep -rn "from \"@moonwitness/ui\"" apps/web/src
grep -rn "\bButton\b\|\bCard\b\|\bBadge\b" apps/web/src --include=*.tsx | grep -v "ZineButton\|ZineCard\|ZineBadge"
```

Expected: keduanya 0 baris (atau hanya kecocokan yang jelas bukan komponen lama). Lalu:

```bash
git rm packages/ui/src/button.tsx packages/ui/src/card.tsx packages/ui/src/badge.tsx
```

- [x] **Step 9: Adopsi primitif di app (hanya yang 1:1)**

Ganti markup app dengan komponen, **tanpa mengubah kelas lain** yang menyertainya:

| situs | sebelum | sesudah |
|---|---|---|
| `shadow/page.tsx:92,93` | `<span className="tape -top-3 left-10 -rotate-6" />` | `<Tape className="-top-3 left-10 -rotate-6" />` |
| `landing.tsx:197`, `landing.tsx:324` | `<span className="tape ..." />` | `<Tape className="..." />` |
| `landing.tsx:461` | `<div className="halftone-pink pointer-events-none absolute inset-0 opacity-30" />` | `<Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-30" />` |
| `mission-control.tsx:94` | `<div className="halftone absolute inset-0 opacity-40" />` | `<Halftone className="absolute inset-0 opacity-40" />` |
| `landing.tsx:125` | `<div className="halftone relative h-72 ...">` | biarkan — ini container beranak, bukan overlay; `Halftone` hanya untuk overlay |
| `shadow/page.tsx:55`, `dock.tsx:281`, `landing.tsx:296,512`, `mission-control.tsx:243` | `<div className="grain relative ...">` | `<div className="relative ...">` + `<Grain />` sebagai anak pertama |
| semua `<input className="zine-input ...">` (5 situs, cari dengan `grep -rn "zine-input" apps/web/src`) | | `<ZineInput className="..." />` |

Untuk `grain`, satu contoh lengkap (`dock.tsx:281`):

```tsx
// sebelum
<div className="grain relative overflow-hidden border-b-2 border-[var(--line)]">
  ...isi...
</div>

// sesudah
<div className="relative overflow-hidden border-b-2 border-[var(--line)]">
  <Grain />
  ...isi...
</div>
```

`.grain::after` tadinya menutupi element itu sendiri; sekarang menutupi span `absolute inset-0` di dalam parent yang sama. Hasil render identik. **`btn-zine`, `sticker`, `zine-card`, `zine-card-rough` sengaja belum dikonversi di task ini** — konversinya dilakukan bersama pemecahan file (Task 11-13) supaya satu file tidak disentuh dua kali untuk hal yang sama.

> **Cacat plan #2, sudah diperbaiki saat eksekusi.** Baris "semua `<input className="zine-input ...">` (5 situs)" salah kategori. `grep -rn "zine-input" apps/web/src` memang menghasilkan 5 baris, tapi yang di `dock.tsx:349` adalah `<select id="dock-sort">` (dropdown Sort: Newest/Oldest), bukan `<input>`. `ZineInput` merender `<input>`, jadi memakainya di sana menghapus dropdown dan seluruh opsi sort. Yang dilakukan: **4 situs `<input>` dikonversi** (`shadow/page.tsx` email + password, `empire-shell.tsx` pencarian, `site-nav.tsx` pencarian overlay) dan `<select>` dibiarkan memakai kelas mentah `zine-input` — kelas itu tetap global dari `base.css`, jadi tampilannya sama. Kalau nanti tetap ingin komponen, yang dibutuhkan adalah `ZineSelect` terpisah, bukan memaksa `ZineInput`.

- [x] **Step 10: Pipeline + bukti gerbang + bukti visual**

```bash
pnpm turbo run lint typecheck build
grep -o '\.18em' apps/web/.next/static/css/*.css
```

Expected: pipeline hijau dan grep menemukan `.18em` (bukti `@source` masih bekerja setelah primitif pindah).

Tercatat: **11/11 task sukses** dan `grep -o '\.18em' apps/web/.next/static/css/*.css` = **3 kecocokan**. Gerbang grep Step 8 juga diuji terhadap masukan yang seharusnya cocok (`grep -rn "\bButton\b|\bCard\b|\bBadge\b" packages/ui/src` → 6 kecocokan), jadi angka 0 di `apps/web/src` berarti benar-benar "tidak ada pemakai", bukan pola yang mati.

Bukti visual pakai gerbang empat bukti, dan khusus task ini bukti utamanya adalah *computed style* elemen primitif (karena yang berubah adalah siapa yang merender elemen, bukan tampilannya). Di `next start -p 4317`, listener console dipasang sebelum navigasi, viewport 1280×900:

| rute | `Grain` (span `.grain`) | `Tape` | `Halftone` | `ZineInput` (`input.zine-input`) | error+warning |
|---|---|---|---|---|---|
| `/` | 2 — 1270×828 & 1270×562, `::after` `position:absolute` + `background-image: url("data:image/svg+xml,…")` + `mix-blend-mode: overlay` | 2 — 95×38 & 93×31, `position:absolute` | pink 8px 8px radial + container `.halftone` lama 7px 7px (sengaja dibiarkan, lihat tabel Step 9) | 0 | 0 |
| `/shadow` | 1 — 1280×900 | 2 — 94×35 & 93×31 | 0 | 2 — border `rgb(42,42,56)`, bg `rgb(14,14,21)` | 0 |
| `/dock` | 1 — 1030×283 | 0 | 0 | 1 (kolom pencarian `EmpireShell`) | 0 |
| `/mission-control` | 1 — 1030×260 | 0 | 1 — 7px 7px | 1 | 0 |

Tiga kegagalan senyap yang disebut plan sudah dicek satu per satu: noise `grain` **tidak** hilang (span `absolute inset-0` + `::after` terisi), `tape` **tidak** bergeser (parent tetap `relative`, ukuran pil sama seperti sebelum migrasi), dan focus input **tidak** kehilangan border pink — `page.focus('input.zine-input')` menghasilkan `border-color: rgb(255,45,120)` + `box-shadow: rgba(255,45,120,0.2) 0 0 0 3px`. Overflow 390px: `scrollWidth = clientWidth = 380`.

Screenshot di `.verify/phase1-task6/` (`p6-landing-1280.png`, `p6-shadow-1280.png`, `p6-mission-control-1280.png`).

Matikan server (sudah; `netstat` 4317 kosong).

- [x] **Step 11: Commit**

```bash
git add packages/ui/src apps/web/src pnpm-lock.yaml
git commit -m "feat(ui): primitif zine (button, sticker, tape, card, badge, input, image, marquee, texture)

Menghapus Button/Card/Badge scaffold lama yang tidak punya pemakai."
```

**`git add apps/web/src` tidak dijalankan apa adanya** — perintah itu ikut menyeret `globals.css` (masih memegang blok duotone/marginalia milik WIP orang lain) dan seluruh WIP di `landing.tsx`. Yang di-stage: `packages/ui/{package.json,src/index.ts,src/probe.ts,src/primitives/*}` + 3 penghapusan scaffold + `pnpm-lock.yaml` + 5 file app yang diff-nya memang murni milik task ini (`shadow/page.tsx`, `dock.tsx`, `empire-shell.tsx`, `mission-control.tsx`, `site-nav.tsx`), sementara `landing.tsx` di-stage sebagian: versi commit dibangun ulang dari `git show HEAD:` lalu 8 transformasi task ini diterapkan dengan `perl -0777`, diperiksa `diff`-nya hanya memuat 8 perubahan itu, baru masuk index lewat `git hash-object -w` + `git update-index --cacheinfo`.

Bukti konsistensi state yang di-commit (bukan working tree): `git grep --cached "duo-img\|duo-tint\|duo-halftone\|marginalia" -- apps packages` = **kosong**, jadi tidak ada kelas yang direferensikan tapi tidak didefinisikan; dan `git grep --cached -o 'from "@moonwitness/ui"' -- apps/web/src | wc -l` = **6**, sama dengan jumlah file yang mengimpor primitif.

### Task 7: Komposit timeline (`EventCard`, `EventDetail`, `EraBand`)

**Files:**
- Create: `packages/ui/src/composites/kind-colors.ts`
- Create: `packages/ui/src/composites/event-card.tsx`
- Create: `packages/ui/src/composites/event-detail.tsx`
- Create: `packages/ui/src/composites/era-band.tsx`
- Modify: `packages/ui/src/index.ts` (tambah 4 export)
- Modify: `apps/web/src/components/dock.tsx` (hapus `KindBadge` 10-19, `EventCard` 21-99, `EventDetail` 101-239, blok Era Band 394-450; ganti dengan pemakaian komposit)
- Modify: `apps/web/src/lib/data.ts` (hapus `kindColors` — pindah ke paket)

**Interfaces:**
- Consumes: `TimelineEvent`, `Era`, `EraId`, `EventKind` dari `@moonwitness/types`; `ZineCard`, `ZineCardRough`, `ZineBadge`, `ZineImage`, `Sticker`, `Tape` dari Task 6; `Crown`, `ArrowRight`, `Splatter`, `Star4` dari Task 5.
- Produces:

```ts
const kindColors: Record<EventKind, string>   // @moonwitness/ui
function EventCard(props: {
  event: TimelineEvent;
  selected: boolean;
  list: boolean;
  onOpen: () => void;
}): JSX.Element
function EventDetail(props: {
  event: TimelineEvent;
  era: Era;
  relatedEvents: TimelineEvent[];
  shareUrl: string;
  onRelated: (id: string) => void;
  onClose?: () => void;
}): JSX.Element
function EraBand(props: {
  eras: Era[];
  active: EraId | "all";
  onSelect: (era: EraId | "all") => void;
}): JSX.Element
```

- [x] **Step 1: `kind-colors.ts`**

Pindahkan nilai dari `apps/web/src/lib/data.ts:275-282` apa adanya:

```ts
import type { EventKind } from "@moonwitness/types";

/** Warna per jenis sinyal. Milik design system, bukan data. */
export const kindColors: Record<EventKind, string> = {
  PROJECT: "#ff2d78",
  STORY: "#2ea8ff",
  SIGNAL: "#ffd21f",
  WORLD: "#a855f7",
  PEOPLE: "#ff2d78",
  RESEARCH: "#2ea8ff",
};
```

Hapus `kindColors` dari `lib/data.ts`, lalu perbaiki pemakainya:

```bash
grep -rn "kindColors" apps/web/src
```

`dock.tsx` dan `landing.tsx` (baris 247) mengimpornya dari `@/lib/data` — ubah jadi `import { kindColors } from "@moonwitness/ui"`.

> **Koreksi saat eksekusi.** Hanya `landing.tsx` yang perlu diarahkan ulang (`kindColors` ditambahkan ke impor `@moonwitness/ui` yang sudah ada di baris 9). `dock.tsx` justru **berhenti** mengimpor `kindColors` sama sekali: satu-satunya pemakai di file itu adalah `KindBadge` dan daftar related, dan keduanya pindah ke paket pada Step 2–3. Menambahkan impor yang tidak dipakai akan melanggar `noUnusedLocals`. Verifikasi: `grep -rn "kindColors" apps/web/src packages/ui/src` → 8 baris, semuanya di `landing.tsx` (impor + 1 pemakaian) dan `packages/ui` (definisi + komposit + `index.ts`); `apps/web/src/lib/data.ts` sudah bersih.

- [x] **Step 2: `event-card.tsx`**

> **Cacat plan, dan ini yang mengubah bentuk `ZineImage`.** Step ini menyuruh membuang `objectPosition` per event dan menggantinya satu nilai per artwork dari manifest, dengan remedi "salin nilai `imagePosition` yang paling umum". Di data yang ada remedi itu tidak mungkin: `timelineEvents` punya **13 event, 13 nilai `imagePosition`, dan semuanya unik** — tidak ada yang paling umum. Distribusi per artwork: `city-shadow` → `70% 40%`, `80% 60%`, `55% 30%`, `75% 55%`; `hero-witness` → `20% 30%`, `35% 20%`, `60% 45%`; `crew-rooftop` → `50% 20%`, `30% 55%`, `50% 35%`, `60% 25%`; `signal-tunnel` → `50% 45%`, `50% 60%`. Menyalin satu nilai ke `ARTWORK[key].position` juga merusak tempat lain, karena posisi manifest dipakai bersama oleh hero: `hero-witness` `"30% center"` adalah framing hero `/` (landing), dan `crew-rooftop`/`city-shadow` dipakai kartu landing + pita era.
>
> **Yang dilakukan:** `ZineImageProps` dapat `position?: string` dan `<img>`-nya memakai `position ?? entry.position ?? "center"`. Jadi `EventCard`/`EventDetail` meneruskan `event.imagePosition` (framing per event persis seperti sebelumnya) sementara pemakai lain tetap mewarisi nilai manifest. Ini bukan kompromi diam-diam: `position` adalah data presentasi per-instance, bukan desain global, jadi tempatnya memang di prop, bukan di manifest. `next/image` tidak kembali masuk paket — gerbang §3.2 tetap 0.

Pindahkan badan `EventCard` dari `dock.tsx:21-99` apa adanya, dengan tiga perubahan wajib:

1. Prop `ev: DockEvent` → `event: TimelineEvent`; `onSelect: () => void` → `onOpen: () => void`. Semua `ev.` di badan menjadi `event.`.
2. `KindBadge` lokal (`dock.tsx:10-19`) ikut pindah ke file ini sebagai komponen internal, memakai `ZineBadge`:

```tsx
import { ZineBadge } from "../primitives/zine-badge";
import { kindColors } from "./kind-colors";

function KindBadge({ kind }: { kind: EventKind }) {
  return (
    <ZineBadge color={kindColors[kind]} dark={kind === "SIGNAL"}>
      {kind}
    </ZineBadge>
  );
}
```

`dark` menggantikan logika `color: kind === "SIGNAL" ? "#111" : "#fff"` yang tadinya inline. Nilai `kindColors` identik, jadi hasil render identik.

3. `<Image src={ev.image} alt="" fill sizes="96px" style={{objectPosition}} />` → `<ZineImage art={event.image} alt="" sizes="96px" />`. `objectPosition` tidak perlu ditulis lagi: `ZineImage` mengambilnya dari manifest. **Konsekuensi yang harus dicek di Step 5**: nilai `imagePosition` per event di `lib/data.ts` kini diabaikan, diganti satu nilai per artwork dari manifest. Kalau perbandingan screenshot menunjukkan framing gambar berubah, salin nilai `imagePosition` yang paling umum ke `ARTWORK[key].position` di `packages/assets/src/index.ts` — jangan mengembalikan `next/image` ke dalam paket.

Export `KindBadge` juga (dipakai `EventDetail`):

```ts
export { KindBadge };
```

- [x] **Step 3: `event-detail.tsx`**

> **Konsekuensi tipe dari `era` jadi prop wajib.** Di `dock.tsx` lama `era` hasil `eras.find(...)` bisa `undefined`, sehingga body-nya menulis `{era?.name} ({era?.years})`. Dengan kontrak `era: Era` (wajib), optional chaining itu salah dan TS tidak memaksa apa pun karena `era.name` tetap valid — jadi ditulis `{era.name} ({era.years})`. Tidak ada perubahan tampilan: `selected.era` selalu `EraId` yang ada di `eras`. File ini satu-satunya komposit yang dapat `"use client"` (dipakai `useState` untuk status "Copied ✓"), sesuai aturan §3.2.

Pindahkan badan `EventDetail` dari `dock.tsx:101-239` apa adanya, dengan perubahan wajib:

1. Signature jadi persis kontrak di atas. Hapus `ev` → `event`.
2. Dua baris yang membaca data app:

```tsx
// sebelum
const era = eras.find((e) => e.id === ev.era);
const related = dockEvents.filter((e) => ev.related.includes(e.id));
// sesudah: keduanya jadi prop, hapus baris ini
```

3. Fungsi `share()` yang memakai `window.location.origin` diganti memakai prop `shareUrl`:

```tsx
async function share() {
  try {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    window.prompt("Copy the signal link:", shareUrl);
  }
}
```

`window.prompt` tetap boleh (itu API browser, bukan `next/*`).

4. Semua `<Image src={...}>` → `<ZineImage art={...}>` dengan `sizes` yang sama seperti sebelumnya.
5. `onSelect(id)` → `onRelated(id)`; `KindBadge` diimpor dari `./event-card`.

- [x] **Step 4: `era-band.tsx`**

> **Dua detail yang tidak disebut plan.** (1) Ternary path literal di `dock.tsx:411-421` (`fracture` → `/art/signal-tunnel.png`, dst.) tidak bisa dipindah apa adanya ke paket karena `ZineImage` menerima `ArtKey`, bukan string path. Diganti peta `const eraArt: Record<EraId, ArtKey>` di awal file — `Record` dengan kelima `EraId` membuat TS menolak bila ada era baru tanpa artwork, yang justru lebih kuat dari ternary lama (yang diam-diam menjatuhkan era tak dikenal ke `crew-rooftop`). (2) `Image` lama tidak menulis `objectPosition`, jadi default browser `50% 50%`. Tanpa perlakuan khusus, `ZineImage` akan mewarisi posisi manifest (mis. `hero-witness` `"30% center"`) dan menggeser framing kelima chip. Karena itu chip sengaja diberi `position="center"` supaya blok ini benar-benar "apa adanya".

> **Menggantikan rencana Task 17.** Task 17 Step (yang memecah `dock.tsx`) menyebut baris literal era sebagai sisa path mentah yang harus dibereskan di app. Baris itu sudah hilang dari app sejak task ini — ia pindah ke `packages/ui/src/composites/era-band.tsx` sebagai `ArtKey`. Task 17 tidak perlu lagi menyentuhnya.

Pindahkan blok Era Band dari `dock.tsx:394-450` apa adanya menjadi komponen, dengan perubahan:

1. `eras` → prop. `era` → prop `active`. `setEra(...)` → pemanggilan `onSelect(...)`:

```tsx
onClick={() => onSelect(active === e.id ? "all" : e.id)}
```

Kedua pemetaan (`eras.map` untuk chip dan untuk bar) memakai pola yang sama.

2. State `era` **tetap di app** (`dock.tsx`), karena state itu juga memfilter daftar event. Komponen ini murni terkendali (controlled).

- [x] **Step 5: Perbarui `index.ts` dan `dock.tsx`**

> **Yang berubah dari contoh kode di Step ini.** (1) `EraBand.active` bertipe `EraId | "all"`, sedangkan state lama `useState<string>` — jadi typenya ikut diperketat: `useState<EraId | "all">((params.get("era") ?? "all") as EraId | "all")`. Cast itu sengaja, bukan penjaga: nilai `?era=` dari URL memang tidak divalidasi, dan perilaku untuk nilai tak dikenal sama persis dengan sebelumnya (nol event, karena `e.era === era` tidak pernah cocok). (2) Contoh plan memakai `eras.find(...)!`; tanpa assertion, `EventDetail` butuh `Era` wajib. Yang dipakai adalah cabang eksplisit yang plan sendiri tawarkan: `const selectedEra = selected ? eras.find((e) => e.id === selected.era) : undefined;` lalu render bersyarat `selected && selectedEra` — di `aside` maupun drawer. Tidak ada `!` di file ini. (3) `relatedEvents` ikut dihitung di app (dulu `timelineEvents.filter` di dalam badan `EventDetail`), begitu juga `origin` dari `useEffect` sesuai pola yang plan tulis. (4) Impor yang jadi tidak terpakai di `dock.tsx` ikut dihapus (`ArrowRight`, `artSrc`, `type TimelineEvent`, `kindColors`); `Image`/`next/image` **tetap** karena hero `priority` (§3.2 melarangnya di paket, bukan di app).

Tambah ke `packages/ui/src/index.ts`:

```ts
export { kindColors } from "./composites/kind-colors";
export { EventCard, KindBadge } from "./composites/event-card";
export { EventDetail } from "./composites/event-detail";
export { EraBand } from "./composites/era-band";
```

Di `dock.tsx`, hapus keempat definisi lokal dan ganti pemakaiannya:

```tsx
import { EraBand, EventCard, EventDetail } from "@moonwitness/ui";

// daftar event
<EventCard
  event={ev}
  selected={selected?.id === ev.id}
  list={view === "list"}
  onOpen={() => select(ev.id)}
/>

// panel detail desktop (aside xl)
<EventDetail
  event={selected}
  era={eras.find((e) => e.id === selected.era)!}
  relatedEvents={timelineEvents.filter((e) => selected.related.includes(e.id))}
  shareUrl={`${origin}/dock?event=${selected.id}`}
  onRelated={select}
/>

// pita era
<EraBand eras={eras} active={era} onSelect={setEra} />
```

`origin` tidak ada di komponen server-safe — `dock.tsx` adalah `"use client"`, jadi hitung sekali di dalam komponen dengan guard:

```tsx
const [origin, setOrigin] = useState("");
useEffect(() => setOrigin(window.location.origin), []);
```

`eras.find(...)!` memakai non-null assertion karena `selected.era` selalu salah satu `EraId` yang ada di `eras`. Kalau `noUncheckedIndexedAccess`/lint menolak `!`, tulis eksplisit:

```tsx
const selectedEra = eras.find((e) => e.id === selected.era);
// ...render EventDetail hanya bila selectedEra ada
```

- [x] **Step 6: Pipeline + bukti visual**

```bash
pnpm turbo run lint typecheck build
grep -rn "next/image\|next/link\|next/navigation" packages/ui/src
```

Expected: pipeline hijau; grep **0 baris** (aturan §3.2). Kalau grep menemukan sesuatu, komposit masih menyeret Next ke dalam paket — pindahkan bagian itu ke app.

Lalu SHOT ke `.verify/phase1-task7/`, bandingkan `.verify/phase0/dock-*.png`. Fokus: kartu event (border pink saat terpilih), panel detail (tombol copy, related, tags), pita era (chip aktif). Klik satu kartu lalu satu related event untuk memastikan callback masih bekerja.

Matikan server.

**Hasil pipeline.** `pnpm turbo run lint typecheck build` → **11/11 sukses** (6 cached), `/dock` 2.89 kB / First Load 125 kB, 9 halaman statis ter-generate.

**Gerbang §3.2.** `grep -rn "next/image\|next/link\|next/navigation" packages/ui/src` → **0 baris**. Gerbang ini diverifikasi dulu terhadap input jahat (aturan sesi): `packages/ui/src/__gate_probe.tsx` berisi `import Image from "next/image"` membuat grep yang sama mengembalikan 1 hit (`__gate_probe.tsx:1`), lalu file probe dihapus dan grep kembali 0. Tanpa bukti itu, "0" tidak membedakan "isolasi terjaga" dari "grep tidak membaca apa pun".

**Bukti visual (empat bukti, seperti Task 4–6).** Server `next start -p 4317` (port dicek `netstat` dulu, bebas), listener console dipasang sebelum navigasi, `waitUntil: domcontentloaded`.

| viewport | scrollWidth×innerWidth | error console per navigasi | bukti utama |
|---|---|---|---|
| 1440×900 | 1440×1440 (tidak overflow) | **0** | 13 kartu; klik kartu #2 → detail `MOONWITNESS IS BORN` → `THE SHADOW GROWS`; border kartu terpilih `rgb(255,45,120)` = `--pink`; klik related #1 → `A BRIGHTER QUESTION`; 3 tag pill; tombol Share warna `rgb(46,168,255)` |
| 1440, `?era=fracture` | — | **0** | chip aktif `aria-pressed=true` + `filter:none`, empat chip lain `filter:grayscale(1)`, `object-position:50% 50%` (peta `eraArt` benar) |
| 1440, share | — | **0** | `navigator.clipboard.writeText` disadap lewat `addInitScript` → teks tersadap `http://127.0.0.1:4317/dock?event=moonwitness-born`, tombol berubah jadi `Copied ✓`. Ini bukti `origin` (guard `useEffect`) + prop `shareUrl` tersambung; tanpa sadapan, kegagalan clipboard akan memanggil `window.prompt` dan memblokir Playwright |
| 1440, pita era diklik | — | **0** | `Showing 13 of 13` → `Showing 2 of 13` → klik lagi → `13 of 13`. State penyaring memang tetap di app, komponen hanya terkendali |
| 390×844 | 380×390 | **0** | kartu → drawer `role=dialog` muncul, judul `NEW WORLDS, SAME SKY`, tombol ✕ menghapus drawer dari DOM |
| 768×1024 | 758×768 | **0** | 5 chip pita era tetap ter-render |

**`objectPosition` per event selamat.** List view: `60% 25%`; grid view kartu pertama: `60% 25%`; drawer detail: `60% 25%` — semuanya nilai dari `lib/data.ts`, bukan nilai manifest. Ini yang membedakan deviasi Step 2 dari "kebetulan mirip".

**Ukuran halaman identik dengan baseline.** `dock-1440.png` 1430×2537 vs `p7-dock-1440.png` 1430×2537; 768: 758×2748 kedua-duanya; 390: 380×4715 kedua-duanya. Tidak ada reflow.

**Kenapa diff pixel vs phase0 sengaja tidak dipakai sebagai gerbang.** Diff baris per baris terhadap `phase0/dock-1440.png` menghasilkan mean 1.13 dengan pita perubahan tepat pada tinggi gambar kartu (586–685, 860–956, 1134–1232, dst.), dan mean 8.66 di 768 / 6.60 di 390. Angka ini **tidak** berarti regresi: baseline phase0 diambil sebelum Task 4–7, jadi diff-nya memuat (a) sumber gambar pindah dari `/_next/image?url=…png` ke `<picture>` AVIF/WebP hasil pipeline Task 3 — encoder beda, pixel pasti beda, dan itu memang tujuan refactor; (b) perubahan CSS Task 4, ikon Task 5, primitif Task 6; (c) header/hero di viewport kecil. Karena itu pembandingnya computed style + ukuran layout + crop mata, dan crop `cmp-band-1440.png` / `cmp-cards-1440.png` (kiri baseline, kanan Task 7) menunjukkan framing artwork, label, tanggal, badge, dan panel detail sama.

**Delta visual yang diterima dan disengaja.** Badge jenis (`PROJECT`, `SIGNAL`, …) kini sedikit lebih renggang karena `ZineBadge` membawa `SOURCE_PROBE_CLASS` (`tracking-[0.18em]`) — perawatan design system yang sudah diputuskan di Task 6, bukan efek samping Task 7. Warna badge identik (`kindColors` dipindah apa adanya; `dark` menggantikan `color: kind === "SIGNAL" ? "#111" : "#fff"`).

**Dua jebakan yang tercatat.** (1) Log console agregat `.playwright-mcp/console-*.log` bertambah 46 baris tepat setelah navigasi pertama, isinya `ERR_CONNECTION_REFUSED` dan "Failed to fetch RSC payload" — semuanya ber-timestamp ~1,547,477 ms, yaitu sisa dari konteks browser yang sama ketika port 4317 masih mati (sebelum Task 6 ditutup). Penomoran "New console entries" dari tool menandai baris *baru bagi tool*, bukan baru bagi navigasi ini; yang bisa dipakai hanya listener yang dipasang sendiri per navigasi (hasil: 0). (2) `filter` chip aktif sempat terbaca `grayscale(1)` sesaat setelah klik karena `transition-all duration-300` — pengukuran ulang yang membaca kelima chip sekaligus memberi `none` untuk yang aktif. Lesson: jangan simpulkan state transisi dari satu sampel.

Matikan server: listener PID 28040 dihentikan, `netstat` tidak menyisakan `LISTENING` di 4317 (hanya `TIME_WAIT` sisa koneksi).

- [x] **Step 7: Commit**

```bash
git add packages/ui/src apps/web/src/components/dock.tsx apps/web/src/lib/data.ts apps/web/src/components/landing.tsx
git commit -m "refactor(ui): komposit timeline (EventCard, EventDetail, EraBand) pindah ke paket"
```

**Yang sebenarnya dijalankan — `git add apps/web/src/components/landing.tsx` tidak dipakai apa adanya.** File itu masih memegang WIP orang lain (blok `.duo-*`/`.marginalia` + hover treatment di working tree, lihat catatan Task 4 Step 10). Resep partial staging yang sama dengan Task 4–6: `git show HEAD:…landing.tsx` → tempel ke `.verify/tmp_landing_head.tsx`, ganti **hanya** dua baris impor dengan penggantian string persis, tulis ke `.verify/tmp_landing_staged.tsx`, lalu `git hash-object -w` + `git update-index --cacheinfo 100644,<blob>,apps/web/src/components/landing.tsx`. Hasil: `git status` = `MM landing.tsx` (index punyaku, working tree punyanya), dan `git diff --cached -- …landing.tsx` = **2 baris** (`-kindColors` dari `@/lib/data`, `+kindColors` di impor `@moonwitness/ui`) — nol hunk asing.

Perintah `git add` untuk `packages/ui/src`, `dock.tsx`, `data.ts`, dan plan tetap aman: ketiganya tidak pernah disentuh WIP asing (status awal sesi hanya `M globals.css` + `M landing.tsx`).

Bukti konsistensi state yang di-commit: `git grep --cached "duo-img\|duo-tint\|duo-halftone\|marginalia" -- apps packages` = **kosong** (tidak ada kelas yang direferensikan tapi tidak didefinisikan di HEAD); `git grep --cached -n kindColors` = 9 baris, semuanya sah (2 di `landing.tsx`, 6 di `packages/ui`, 1 definisi); `packages/ui/src/index.ts` baris 14–17 memuat keempat ekspor komposit; `dock.tsx` hanya memakai komposit lewat satu impor `@moonwitness/ui`.

**Batasan yang dicatat jujur:** pipeline 11/11 dijalankan terhadap *working tree*, bukan terhadap checkout bersih dari commit ini. Yang membuktikan HEAD konsisten adalah grep di atas (satu-satunya selisih HEAD vs working tree adalah pasangan `landing.tsx`/`globals.css` milik orang lain, dan HEAD tidak mereferensikan kelas dari sisi working tree mana pun), bukan build bersih.

Commit: `6c6ef1f refactor(ui): komposit timeline (EventCard, EventDetail, EraBand) pindah ke paket` — 10 file, +416/−319.

---

### Task 8: Komposit landing (`TransmissionCard`, `CrewConstellation`)

`ArchiveStrip` **tidak** ikut pindah (lihat R3) — ia tetap di app dan baru dipecah di Task 11.

**Files:**
- Create: `packages/ui/src/composites/transmission-card.tsx`
- Create: `packages/ui/src/composites/count-up.tsx`
- Create: `packages/ui/src/composites/crew-constellation.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/components/landing.tsx` (hapus 10-84 `TransmissionCard`, 86-117 `CountUp`, 119-219 `CrewConstellation`)

**Interfaces:**
- Consumes: `TimelineEvent`, `Witness` dari `@moonwitness/types`; `ZineCardRough`, `ZineCard`, `Sticker`, `Tape`, `ZineImage` dari Task 6; `PlayIcon`, `PauseIcon`, `Crown`, `ArrowRight` dari Task 5.
- Produces:

```ts
function CountUp(props: { target: number; suffix?: string }): JSX.Element
function TransmissionCard(props: {
  event: TimelineEvent;
  durationSeconds?: number;
  label?: string;
}): JSX.Element
function CrewConstellation(props: {
  witnesses: Witness[];
  stats: { label: string; target: number }[];
  cta?: ReactNode;   // slot R2: app yang menyuplai <Link>
}): JSX.Element
```

- [x] **Step 1: `count-up.tsx`**

Pindahkan `CountUp` dari `landing.tsx:86-117` apa adanya. Tambah `"use client"` di baris pertama file (ia memakai `useRef`/`useEffect`/`IntersectionObserver`). Tidak ada perubahan lain.

> **Koreksi saat eksekusi:** rentang baris di atas sudah bergeser; yang sebenarnya dihapus adalah `landing.tsx:12-87` (`TransmissionCard`), `89-120` (`CountUp`), `122-222` (`CrewConstellation`) pada working tree, dan `12-86` / `88-119` / `121-221` pada HEAD. Isi dipindah verbatim, tidak ada satu pun kelas atau angka yang diubah.

- [x] **Step 2: `transmission-card.tsx`**

Pindahkan `TransmissionCard` dari `landing.tsx:10-84`, dengan perubahan wajib:

1. Tambah `"use client"` (state timer internal — §3.2 mengizinkan karena state tidak bocor ke tipe publik).
2. Isi yang tadinya hardcoded jadi berasal dari prop `event`:

| hardcoded lama | baru |
|---|---|
| `const total = 204` | `durationSeconds = 204` (default prop) |
| `TRANSMISSION 001` | prop `label` (default `"TRANSMISSION 001"`), karena angka 001 adalah teks tampilan, bukan turunan dari `event.id` |
| `<h3>A SIGNAL FROM BELOW</h3>` | `{event.title.toUpperCase()}` |
| `<p>Strange sounds…</p>` | `{event.excerpt}` |
| `src="/art/signal-tunnel.png"` + alt | `<ZineImage art={event.image} sizes="(max-width: 768px) 100vw, 33vw" />` |

Signature akhir:

```tsx
export interface TransmissionCardProps {
  event: TimelineEvent;
  durationSeconds?: number;
  label?: string;
}
export function TransmissionCard({ event, durationSeconds = 204, label = "TRANSMISSION 001" }: TransmissionCardProps) { ... }
```

3. `fmt`, progressbar `role="progressbar"` + `aria-valuenow/min/max`, `aria-label` tombol play/pause: **pertahankan semua**. Itu a11y yang sudah benar dan akan diperiksa lagi di Task 16.

> **Cacat plan (ditemukan sebelum menulis kode):** tabel di atas menyuruh `{event.title.toUpperCase()}` / `{event.excerpt}` dan Step 4 menyuruh `event={timelineEvents[0]!}`. `timelineEvents[0]` adalah `moonwitness-born` → *"MOONWITNESS IS BORN"* + *"First public signal. A small site, a big question."* + artwork `city-shadow`, sedangkan kartu lama menampilkan *"A SIGNAL FROM BELOW"* + *"Strange sounds. A deeper current. What are we really hearing?"* + `signal-tunnel`. `grep -ri "signal from below\|strange sounds\|deeper current" apps/web/src/lib` → **0 match**: copy itu tidak dimiliki event mana pun, jadi menjalankan plan apa adanya = mengganti isi landing, bukan merombak strukturnya.
>
> **Deviasi yang dipilih:** `TransmissionCardProps` ditambah dua override opsional, `title?: string` dan `excerpt?: string`, yang defaultnya tetap `event.title` / `event.excerpt` (`(title ?? event.title).toUpperCase()`). Komponennya tetap event-driven untuk pemakaian lain; app yang memegang copy promosi. Event yang dipakai `timelineEvents.find(e => e.id === "voices-in-the-fog")` — dipilih hanya karena artworknya `signal-tunnel` (temanya "audio letters" paling dekat dengan "strange sounds"). `imagePosition` **tidak** diteruskan: `<Image>` lama tidak punya `objectPosition`, dan manifest `signal-tunnel` = `"center"`, jadi `ZineImage` tanpa `position` menghasilkan bingkai yang sama persis.
>
> Konsekuensi yang diterima: `alt` kartu kini dari manifest ("Sosok tunggal berjalan masuk ke terowongan bercahaya merah", bahasa Indonesia) menggantikan alt Inggris yang lama. Ini memang yang diminta tabel plan (baris `src` + alt → `<ZineImage art={event.image}>`), tidak terlihat oleh mata, dan Task 16 yang menilai a11y teks ganti.

- [x] **Step 3: `crew-constellation.tsx`**

Pindahkan `CrewConstellation` dari `landing.tsx:119-219`, dengan perubahan wajib:

1. `"use client"` di baris pertama.
2. `witnesses` jadi prop; state pilihan tetap internal (§3.2):

```tsx
const [selected, setSelected] = useState(witnesses[0]);
```

`witnesses[0]` bertipe `Witness | undefined` karena `noUncheckedIndexedAccess`. Tangani tanpa mengubah tampilan:

```tsx
const [selectedId, setSelectedId] = useState<string | null>(null);
const selected = witnesses.find((w) => w.id === selectedId) ?? witnesses[0];
if (!selected) return null;
```

3. Tiga angka stats yang tadinya literal di dalam komponen (baris 177-181: CREW MEMBERS 1324 / COUNTRIES 87 / SIGNALS 6912) jadi prop `stats`, supaya app yang memegang data:

```tsx
{stats.map((s) => (
  <div key={s.label} className="border border-[var(--line)] bg-[var(--panel-2)] px-2 py-3">
    <div className="font-brush text-xl text-[var(--yellow)] sm:text-2xl">
      <CountUp target={s.target} />
    </div>
    <div className="mt-1 text-[10px] tracking-widest text-zinc-500">{s.label}</div>
  </div>
))}
```

4. `<Link href="/shadow" className="btn-zine btn-blue px-5 py-3 text-base">EXPLORE THE CREW <ArrowRight/></Link>` (baris 213-215) **dihapus dari paket** dan diganti slot `cta`:

```tsx
{cta}
```

App menyuplai `<Link>` yang sama persis, jadi tampilan tidak berubah dan link semantics tetap (R2).

5. `aria-live="polite"` pada kartu profil witness (baris 196) **dipertahankan** — §3.2 menyebutnya eksplisit.

> Catatan: pola `selectedId` + `find(...) ?? witnesses[0]` + `if (!selected) return null` bekerja seperti yang direncanakan; `witnesses[0]!` hilang dan `noUncheckedIndexedAccess` tetap hijau. Ganti `setSelected(w)` → `setSelectedId(w.id)` adalah satu-satunya perubahan perilaku, dan hasilnya identik karena datanya module-level (tidak pernah berubah selama sesi).

- [x] **Step 4: Export + pemakai di app**

Tambah ke `packages/ui/src/index.ts`:

```ts
export { CountUp } from "./composites/count-up";
export { TransmissionCard, type TransmissionCardProps } from "./composites/transmission-card";
export { CrewConstellation } from "./composites/crew-constellation";
```

Di `landing.tsx`:

```tsx
import { CrewConstellation, TransmissionCard } from "@moonwitness/ui";
import { witnesses } from "@/lib/data";

const CREW_STATS = [
  { label: "CREW MEMBERS", target: 1324 },
  { label: "COUNTRIES", target: 87 },
  { label: "SIGNALS", target: 6912 },
];

// di dalam section SIGNALS, tempat TransmissionCard lama:
<TransmissionCard event={timelineEvents[0]!} />

// di dalam section CREW, tempat CrewConstellation lama:
<CrewConstellation
  witnesses={witnesses}
  stats={CREW_STATS}
  cta={
    <Link href="/shadow" className="btn-zine btn-blue px-5 py-3 text-base">
      EXPLORE THE CREW <ArrowRight className="h-4 w-4" />
    </Link>
  }
/>
```

`timelineEvents[0]!` — kalau `!` ditolak lint, ambil lewat `const [firstEvent] = timelineEvents;` lalu render section hanya bila `firstEvent` ada.

> **Yang benar-benar ditulis di app** (bukan `timelineEvents[0]!`, lihat cacat Task 8 Step 2):
>
> ```tsx
> /** Kartu promosi meminjam artwork signal-tunnel dari event ini; copy-nya sendiri. */
> const transmissionEvent = timelineEvents.find((e) => e.id === "voices-in-the-fog");
>
> const CREW_STATS = [
>   { label: "CREW MEMBERS", target: 1324 },
>   { label: "COUNTRIES", target: 87 },
>   { label: "SIGNALS", target: 6912 },
> ];
> ```
>
> Pemakaiannya `{transmissionEvent ? <TransmissionCard event={transmissionEvent} title="A SIGNAL FROM BELOW" excerpt="Strange sounds. A deeper current. What are we really hearing?" /> : null}` — cabang `undefined` ditangani tanpa `!`, persis seperti fallback yang sudah direncanakan. `cta` diisi `<Link href="/shadow" className="btn-zine btn-blue px-5 py-3 text-base">EXPLORE THE CREW <ArrowRight/></Link>` yang identik dengan yang dihapus dari paket.
>
> Import yang jadi tidak terpakai ikut dicabut: `useEffect`, `useState`, `PlayIcon`, `PauseIcon` (0 kemunculan tersisa di file); `useRef`, `Image`, `Link`, `artSrc`, `timelineEvents`, `witnesses`, `kindColors`, `Tape`, `Grain`, `Halftone`, `Bolt`, `Crown`, `Smiley`, `Splatter`, `Star4`, `ArrowRight`, `SiteNav` tetap terpakai — diaudit per-identifier dengan `grep -v '^import ' | grep -cw`, hasilnya 0 import yatim.

> **Penyerapan CSS duo (instruksi owner, di luar plan):** sebelum Task 8, working tree punya blok `@layer components` belum di-commit di `apps/web/src/app/globals.css` berisi `.duo-img`, `.duo-tint`, `.duo-halftone`, `.marginalia` — dan `TransmissionCard` yang mau kupindah memakai `duo-img` + `duo-tint` di dalamnya. Owner memilih "Paksa Task 8 sekarang, bawa duo ke paket", dan komentar di file itu sendiri bilang *"Task yang memakainya yang memindahkannya"*. Jadi keempat aturan dipindah **verbatim** ke `packages/ui/src/base.css` (di dalam `@layer components`, setelah `.zine-input`) dan blok di `globals.css` dihapus sehingga file itu kembali persis seperti HEAD (0 baris diff). Tidak ada yang hilang: kelasnya tetap ada, hanya pemiliknya pindah paket. Sisa pemakaian duo/marginalia di `landing.tsx` (hero, dua kartu sinyal, about, catatan pinggir) **masih WIP orang lain dan tetap tidak k stage** — lihat Step 6.

- [x] **Step 5: Pipeline + bukti visual + bukti `"use client"` di paket**

```bash
pnpm turbo run lint typecheck build
grep -rn "next/" packages/ui/src
```

Expected: hijau; grep 0 baris.

Risiko §10 yang diuji di sini: `"use client"` di dalam paket JIT harus benar-benar di-transpile. Buktinya bukan "build sukses", tapi perilaku: buka `/` di 1440, klik tombol play pada transmission card, dan pastikan timer berjalan (label berubah jadi `● RECEIVING…` dan angka detik bertambah). Lalu klik satu witness dot dan pastikan kartu profil berganti. Kalau keduanya mati tapi halaman tampil normal, `"use client"` tidak ter-transpile — periksa `transpilePackages`.

Ambil SHOT ke `.verify/phase1-task8/`, bandingkan `.verify/phase0/landing-*.png`: posisi constellation, angka CountUp setelah animasi selesai (1324 / 87 / 6912), dan sticker pink "REAL PEOPLE. REAL PLACES. SAME SKY." harus sama.

> **Bukti Step 5 (Task 8).**
>
> **Pipeline.** `pnpm turbo run lint typecheck build` apa adanya **gagal**, tapi bukan karena task ini: working tree sekarang punya `apps/api/` (untracked, tim backend) yang terdaftar lewat glob `apps/*` dan script `lint`-nya memanggil `eslint` yang belum ter-install di sana → `'eslint' is not recognized`. Karena scope task ini hanya UI/frontend, `apps/api` tidak kusentuh; yang kujalankan adalah `pnpm turbo run lint typecheck build --filter='!@moonwitness/api-app'` → **11/11 successful**, `next build` hijau, `/` 9.13 kB / 125 kB First Load JS, 9 route. Ini deviasi lingkungan, bukan pengurangan gerbang: semua paket yang kusentuh ikut jalan.
>
> **Gate arsitektur.** `grep -rn "next/" packages/ui/src` pertama kali **menyalakan alarm palsu**: yang kena adalah komentarku sendiri (`/** Slot R2: app yang menyuplai tautan, jadi semantics next/link tetap di app. */`). Kalimatnya kurewrite, lalu kubuktikan gerbangnya benar-benar hidup dengan probe known-bad — `import Image from "next/image";` ditempel di ujung `crew-constellation.tsx` → grep menemukan 1 baris (exit 0), file dikembalikan → grep 0 baris (exit 1).
>
> **Bukti `"use client"` ter-transpile (perilaku, bukan build).** Diukur pada navigasi bersih (`?probe=<ts>`), satu klik = satu langkah, label & `aria-valuenow` dibaca lewat DOM:
>
> | langkah | `aria-label` tombol | `aria-valuenow` | baris status |
> |---|---|---|---|
> | awal | `Play transmission` | 0 | `STANDBY 00:00 / 03:24` |
> | +1 klik, tunggu 2,2 s | `Pause transmission` | 2 | `● RECEIVING… 00:02 / 03:24` |
> | +1 klik (pause), tunggu 1,8 s | `Play transmission` | 2 (tidak naik) | `STANDBY 00:02 / 03:24` |
>
> Constellation: 7 dot saksi; default terpilih = `witnesses[0]` (Zill / Bandung, ID / 41 signals) — membuktikan fallback `?? witnesses[0]`; klik dot ke-4 → kartu profil berubah jadi Amara / Lagos, NG / 19 signals dan hanya dot itu `aria-pressed=true`. CountUp: sebelum scroll ketiga stats `0…`, setelah `#crew` masuk viewport → `1,324 / 87 / 6,912`. Console per-navigasi: **0 error, 0 warning**.
>
> **Jebakan yang ketemu lagi.** Percobaan pertamaku pakai `waitUntil: 'commit'` + `locator.click()`: klik mendarat di DOM pra-hidrasi sehingga state tidak jalan, dan `innerText` pada locator ber-`filter()` timeout 30 s — dua-duanya *false negative*, bukan bug kode. Ganti ke dokumen baru + `element.click()` di dalam `page.evaluate` → hasilnya deterministik. Pelajaran yang sama seperti Task 7: jangan simpulkan state dari satu percobaan yang gagal diam.
>
> **Bukti visual.** `.verify/phase1-task8/landing-1440.png` = **1430x3500**, persis `phase0/landing-1440.png`. Crop sejajar (`cmp-crew-1440.png`, `cmp-signals-1440.png`, kiri=phase0 kanan=task8): geometri constellation identik (posisi dot, garis, dot kuning terpilih), sticker pink "REAL PEOPLE. REAL PLACES. SAME SKY." identik, kartu profil & tombol EXPLORE THE CREW identik, ketiga judul kartu sinyal + excerpt + progressbar `STANDBY 00:00 / 03:24` identik. Yang **berbeda dan memang harus beda**: (a) angka CountUp di sisi kiri tampil 0 karena capture phase0 tidak memicu IntersectionObserver — bukan regresi, nilainya sudah dibuktikan lewat DOM; (b) gambar kartu kini teduh duo magenta/biru, karena treatment WIP owner ikut masuk ke paket (lihat Step 4).
>
> **Delta tinggi 768/390 dibisik, tidak ditutup-tutupi.** phase0 = 4147 / 4867; sekarang = 4033 / 4919 (−114 / +52). Kukur dengan menukar `landing.tsx` ke versi commit Task 7 (`6c6ef1f`), mengukur ulang, lalu mengembalikan file persis byte (`cmp` → identik): **3500 / 4033 / 4919 — sama persis dengan setelah Task 8**. Jadi pergeseran tinggi itu sudah ada sebelum Task 8 (lahir di Task 5–6 saat CSS `packages/ui` ditulis ulang) dan Task 8 tidak mengubah layout sedikit pun di tiga breakpoint. Tetap masuk daftar pantau checkpoint Task 10.
>
> **Catatan format.** `prettier --check` memang sudah tidak hijau di HEAD (`landing.tsx` punya 2 deviasi: import satu baris >100 karakter dan `<section id="home">` yang di-split; `zine-button.tsx` juga). Edit-ku menghasilkan **2 deviasi yang sama**, jadi tidak ada utang format baru; file tidak kufmt ulang supaya diff Task 8 tidak tenggelam oleh drive-by reformat. `format:check` bukan bagian dari `turbo run lint` dan tidak ada di CI.
>
> Server dimatikan setelah verifikasi (`taskkill` PID, `netstat` → tidak ada `LISTENING` di 4317; hanya socket `TIME_WAIT`).

Matikan server.

- [x] **Step 6: Commit**

```bash
git add packages/ui/src apps/web/src/components/landing.tsx
git commit -m "refactor(ui): TransmissionCard + CrewConstellation jadi komposit prop-driven"
```

> **Eksekusi Step 6.** `git add` buta tidak boleh dipakai di sini: `landing.tsx` masih memuat WIP duo orang lain (hero, dua kartu sinyal, about, empat `marginalia`, dua dekor `Star4`/`Splatter`). Resepnya sama seperti Task 7 — transformasi Task 8 diterapkan **script yang sama** ke dua salinan (`node .verify/task8_wire_landing.mjs <file>`; marker `function TransmissionCard() {` … `function ArchiveStrip() {`), satu ke working tree, satu ke hasil `git show HEAD:…landing.tsx`; lalu `BLOB=$(git hash-object -w .verify/tmp_landing_staged.tsx)` + `git update-index --cacheinfo 100644,$BLOB,apps/web/src/components/landing.tsx`. Hasil: status `MM landing.tsx`, diff ter-stage 6 file (+317/−214), dan `git diff` tersisa 26+/4− yang seluruhnya WIP duo.
>
> Audit isi yang ter-stage (bukan working tree): `duo-|marginalia` = **0** kemunculan; `PlayIcon|PauseIcon|useEffect|useState` = **0**; 19 import diperiksa satu-satu dengan `grep -v '^import ' | grep -cw <nama>` → **0 import yatim**; daftar import file ter-stage persis 8 baris seperti yang diharapkan.
>
> Commit: `5292c89 refactor(ui): TransmissionCard + CrewConstellation jadi komposit prop-driven` (`globals.css` tidak ikut — setelah blok duo kupindah ke `base.css`, isinya kembali identik dengan HEAD sehingga 0 diff).
>
> **Keterbatasan yang jujur:** pipeline dan verifikasi browser dijalankan terhadap **working tree**, bukan checkout bersih dari index. Yang membedakan index dari working tree hanya baris-baris duo WIP di `landing.tsx` (class/tanpa efek layout), dan `landing.tsx` versi index sudah kuaudit sendiri di atas; tetap, kalau nanti ada yang membangun ulang commit ini di checkout bersih, itu belum kubuktikan secara harfiah.

### Task 9: Komposit modul (`ModuleCard`, `ModuleGlyph`)

`OrbitDiagram` (`mission-control.tsx:91-163`) dan `orbitNodes` (81-88) **tidak** dipindah — §D7 menghapusnya, dan penghapusannya terjadi bersama penggantian halaman di Task 27. Memindahkannya ke paket sekarang berarti menulis kode yang langsung dibuang.

**Files:**
- Create: `packages/ui/src/composites/module-glyphs.ts`
- Create: `packages/ui/src/composites/module-glyph.tsx`
- Create: `packages/ui/src/composites/module-card.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/components/mission-control.tsx` (hapus baris 18-27 `moduleIcons`, 29-44 `ModuleIcon`, 46-88 `ModuleCard`)

**Interfaces:**
- Consumes: `Module` dari `@moonwitness/types`; `ZineCardRough` dari Task 6; `Crown`, `ArrowRight` dari Task 5.
- Produces:

```ts
const MODULE_GLYPHS: Record<string, string>          // path stroke SVG per nama ikon modul
function ModuleGlyph(props: { icon: string; className?: string }): JSX.Element
function ModuleCard(props: { module: Module; onOpen: (m: Module) => void }): JSX.Element
```

`ModuleCard` dipakai ulang di fase 4 untuk bagian 8 (tile Story Studio / Poster Forge), jadi ini bukan komponen untuk halaman yang akan dibuang.

- [x] **Step 1: `module-glyphs.ts`**

> **Koreksi saat eksekusi:** rentang baris di header task (18-27 / 29-44 / 46-88) meleset dari tree nyata. Di `mission-control.tsx` HEAD, `moduleIcons` ada di 20-29, `ModuleIcon` 31-46, `ModuleCard` 48-82. Pemotongan dilakukan dengan skrip penanda (`const moduleIcons: Record<string, string> = {` → `const orbitNodes = [`), dengan asersi bahwa irisan yang dibuang memuat kedua `function ModuleCard` dan `function ModuleIcon` — bukan mengandalkan nomor baris.

Pindahkan `moduleIcons` dari `mission-control.tsx` apa adanya, ganti nama jadi `MODULE_GLYPHS` (konstanta, bukan tipe):

```ts
/** Path stroke SVG per ikon modul. Kunci = nilai field Module["icon"]. */
export const MODULE_GLYPHS: Record<string, string> = {
  pen: "M4 20 L6 14 L16 4 L20 8 L10 18 Z M14 6 L18 10",
  image: "M4 5 L20 5 L20 19 L4 19 Z M4 15 L9 10 L14 15 L17 12 L20 15",
  flask: "M10 3 L14 3 M11 3 L11 9 L5 19 Q4 21 7 21 L17 21 Q20 21 19 19 L13 9 L13 3",
  globe:
    "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M3 12 L21 12 M12 3 Q17 8 17 12 Q17 16 12 21 Q7 16 7 12 Q7 8 12 3",
  send: "M3 11 L21 3 L13 21 L10 14 Z M10 14 L21 3",
  gear: "M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19",
  shield: "M12 3 L20 6 L20 12 Q20 18 12 21 Q4 18 4 12 L4 6 Z M8 12 L11 15 L16 9",
};
```

- [x] **Step 2: `module-glyph.tsx`**

Pindahkan `ModuleIcon` dari `mission-control.tsx:29-44` apa adanya, ganti nama jadi `ModuleGlyph` dan sumber path jadi `MODULE_GLYPHS`:

```tsx
import { MODULE_GLYPHS } from "./module-glyphs";

export function ModuleGlyph({ icon, className }: { icon: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={MODULE_GLYPHS[icon] ?? MODULE_GLYPHS.gear} />
    </svg>
  );
}
```

`MODULE_GLYPHS.gear` bertipe `string | undefined` karena `noUncheckedIndexedAccess`, padahal `d` butuh `string`. Tulis fallback-nya eksplisit:

```tsx
      <path d={MODULE_GLYPHS[icon] ?? MODULE_GLYPHS.gear ?? ""} />
```

- [x] **Step 3: `module-card.tsx`**

> **Deviasi kecil:** sama seperti Task 8, tiap komposit diekspor dengan `interface …Props`-nya juga (`ModuleGlyphProps`, `ModuleCardProps`), bukan hanya fungsinya. Markup kartu tetap memakai `zine-card-rough` mentah pada `<button>` (bukan primitif `ZineCardRough`) karena tipe elemennya tidak boleh berubah.

Pindahkan `ModuleCard` dari `mission-control.tsx:46-88` apa adanya. Dua perubahan saja: `ModuleIcon` → `ModuleGlyph` (impor dari `./module-glyph`), dan `<Crown>`/`<ArrowRight>` diimpor dari `../icons`. Signature tetap `{ module, onOpen }` — sudah sesuai §3.2.

- [x] **Step 4: Export + pemakai di app**

> **Cacat plan:** plan hanya menyebut satu pemakai (`<ModuleCard …>`), padahal `ModuleIcon` juga dipakai **kedua kalinya** di drawer modul (`mission-control.tsx` baris ~425, `<ModuleIcon icon={openModule.icon} …/>`). Menghapus `ModuleIcon` lokal tanpa mengganti pemakai itu membuat build merah. Solusi: impor `ModuleGlyph` ke app juga, ganti pemakai drawer jadi `<ModuleGlyph icon={openModule.icon} className="h-7 w-7" />`. Jadi baris import app-nya `import { Grain, Halftone, ModuleCard, ModuleGlyph } from "@moonwitness/ui";` (bukan hanya `ModuleCard`). `Crown` (5×), `ArrowRight` (1×), dan `type Module` tetap diimpor & terpakai di app — audit grep: 0 impor tak terpakai, 0 lokal terlarang tersisa.

Tambah ke `packages/ui/src/index.ts`:

```ts
export { MODULE_GLYPHS } from "./composites/module-glyphs";
export { ModuleGlyph } from "./composites/module-glyph";
export { ModuleCard } from "./composites/module-card";
```

Di `mission-control.tsx`, hapus tiga definisi lokal (baris 18-88) dan tambah import:

```tsx
import { ModuleCard } from "@moonwitness/ui";
```

Pemakaian `<ModuleCard module={m} onOpen={setOpenModule} />` tidak berubah.

- [x] **Step 5: Pipeline + bukti visual + commit**

> **Bukti eksekusi:**
> - **Perubahan lingkungan dari tim backend:** `apps/api` sudah berganti nama jadi `@moonwitness/api` (filter `!@moonwitness/api-app` lama tidak dikenal lagi), dan muncul workspace baru `packages/errors`, `packages/schema`, `packages/contracts`. `pnpm turbo run` memicu auto-install pnpm yang mengotori `pnpm-lock.yaml` (+627 baris) — **bukan perubahan saya, sengaja tidak di-stage.**
> - **Pipeline:** dijalankan dengan `pnpm exec turbo` (bypass verify-deps pnpm) + `--filter='!@moonwitness/api' --filter='!@moonwitness/errors' --filter='!@moonwitness/schema' --filter='!@moonwitness/contracts'`. Hasil **11/11 hijau**. Paket backend `errors`/`schema` gagal lint dengan `'eslint' is not recognized` — persis cacat lingkungan `api-app` di Task 8, di luar scope frontend, jadi di-eksklusi. `/mission-control` build 4.38 kB / 129 kB.
> - **Gate §3.2:** `grep -rn "next/" packages/ui/src` → 0 baris (exit 1).
> - **Bukti visual (`.verify/phase1-task9/mission-control-{1440,768,390}.png` vs `.verify/phase0/`):** dimensi halaman **identik persis** di ketiga viewport — 1430×1487, 758×2629, 380×3073. Grid modul kiri/kanan, warna glyph per modul (pen pink, image biru, flask ungu, globe kuning, send pink, gear biru, shield ungu), dan angka stats sama. `scrollWidth` ≤ viewport (1430/758/380). 0 error konsol di ketiganya.
> - **Interaksi drawer:** klik kartu "STORY FORGE" → tombol `[aria-label="Close module console"]` muncul (count 1) → drawer terbuka. `.verify/phase1-task9/mission-control-drawer.png`.
> - Server dev 4317 sudah dimatikan (`taskkill`, konfirmasi `no listener`).
>
> **Catatan jujur:** pipeline diverifikasi terhadap working tree, bukan commit hasil stage-parsial (belum ada resep stage terpisah di task ini karena semua file task 9 memang milik saya sendiri).

```bash
pnpm turbo run lint typecheck build
grep -rn "next/" packages/ui/src
```

Expected: hijau; grep 0 baris. SHOT ke `.verify/phase1-task9/`, bandingkan `.verify/phase0/mission-control-*.png`: grid modul kiri/kanan, warna ikon per modul, dan angka stats harus sama. Klik satu kartu → drawer modul terbuka.

Matikan server, lalu:

```bash
git add packages/ui/src apps/web/src/components/mission-control.tsx
git commit -m "refactor(ui): ModuleCard + glyph modul pindah ke paket"
```

---

### Task 10: Gerbang fase 1

Task ini tidak menulis kode produk. Ia mengumpulkan bukti bahwa fase 1 selesai dan **netral secara visual** (§7).

**Files:**
- Modify: `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (tambah satu baris status fase 1 di §7)

**Interfaces:**
- Consumes: hasil Task 0-9; `.verify/phase0/` sebagai pembanding.
- Produces: catatan gerbang yang dipakai Task 11-13b sebagai pembanding (`.verify/phase1/`).

- [x] **Step 1: Pipeline penuh**

> **Bukti:** `pnpm exec turbo run lint typecheck build` (bypass verify-deps pnpm) dengan `--filter` mengecualikan `@moonwitness/api`/`errors`/`schema`/`contracts` (paket tim backend, lint-nya gagal karena `'eslint' is not recognized` — lingkungan, di luar scope) → **11/11 hijau**. `@moonwitness/core test` → **7 lulus** (jumlah tidak berubah). `@moonwitness/assets test` → **4 lulus + 1 skip** (skip = tes filesystem, dibuka di Task 19). Catatan: template §7 menyebut "assets 3 tes" — angka sebenarnya 4+1skip.

```bash
pnpm turbo run lint typecheck build && pnpm --filter @moonwitness/core test && pnpm --filter @moonwitness/assets test
```

Expected: semua hijau; `packages/core` tetap **7 tes** (jumlahnya tidak boleh berubah — fase 1 tidak menyentuh `packages/core`).

- [x] **Step 2: Bukti `@source` (ulangi gerbang Task 4 setelah semua komposit ada)**

> **Bukti:** `grep -o '\.18em' apps/web/.next/static/css/*.css` → **3 kecocokan**.

```bash
pnpm --filter @moonwitness/web build
grep -o '\.18em' apps/web/.next/static/css/*.css
```

Expected: ≥ 1 kecocokan.

- [x] **Step 3: Bukti aturan paket**

> **Bukti:** grep `next/*` di `packages/ui/src`+`packages/types/src` → 0 baris (exit 1). `packages/types/package.json` tanpa blok `dependencies` (grep exit 1). `wc -l` via `find`: **satu-satunya** file >150 = `packages/ui/src/composites/event-detail.tsx` (153). Ini leftovers Task 7 (`6c6ef1f`), gerbang Task 7 terlewat. **Keputusan:** tidak memotong paksa di task verifikasi-only ini; pemecahan file besar adalah tugas Fase 2 (gerbang §7 baris 228). Dipakai sebagai catatan pantau, bukan pemblokir fase 1.

```bash
grep -rn "next/image\|next/link\|next/navigation\|next/font" packages/ui/src packages/types/src
grep -rn "\"dependencies\"" -A4 packages/types/package.json
wc -l packages/ui/src/**/*.tsx packages/ui/src/*.ts
```

Expected: grep pertama 0 baris; `packages/types/package.json` tidak punya blok `dependencies`; tidak ada file di atas 150 baris.

- [x] **Step 4: Bukti tidak ada path artwork mentah di data**

> **Bukti:** `grep -n "/art/" apps/web/src/lib/data.ts` → 0 baris (exit 1). `image:` memakai kunci manifest (`city-shadow`, `hero-witness`, dst.), bukan path.

```bash
grep -n "/art/" apps/web/src/lib/data.ts
```

Expected: 0 baris.

- [x] **Step 5: Perbandingan visual penuh**

> **Bukti (`.verify/phase1/`, 4 route × 3 viewport):**
> - **Dimensi halaman: 12/12 identik** dengan `.verify/phase0/` (setelah tangkap pada keadaan settled). `landing-390` = 4867, `shadow-390` = 913 — keduanya cocok persis.
> - **Jebakan yang ditemukan & dibereskan:** tangkap naif (tanpa scroll) membuat `landing-390`/`shadow-390` terukur lebih tinggi (5033/1026) karena CountUp + lazy-image belum settled. Setelah scroll-through + poll sampai `scrollHeight` stabil 3× berturut, tinggi = 4867/913 (identik phase0). Jadi selisih itu artefak waktu tangkap, bukan regresi layout.
> - **Selisih pixel (decoder PNG mandiri + heatmap + profil baris):** tersisa hanya di region gambar — `dock-768` 17%, `landing-768` 13%, `dock-390` 13%, dst.; gap antar-kartu & blok teks = 0%. Dua penyebab, keduanya konsekuensi arsitektur fase 1: (a) pipeline aset statis menyajikan avif/webp manifest, bukan keluaran optimizer `next/image` → beda codec yang tak terlihat mata; (b) state lazy-load beda antar sesi (phase0 dock menayangkan beberapa slot hitam di bawah lipatan, phase1 menayangkan gambar penuh). Perbandingan langsung `dock-768` phase0 vs phase1: grid, posisi kartu, teks, warna, "13/13", filter era — **sama**; gambar yang tumpang-tindih adalah artwork & crop yang sama (`event-card.tsx` meneruskan `position={event.imagePosition}`).
> - **Overflow horizontal 390px:** `scrollWidth` = 390 (`/`), 390 (`/shadow`), 380 (`/mission-control`), 390 (`/dock`) — semuanya ≤ 390. Tidak mundur dari sesi sebelumnya.
> - **Kesimpulan:** fase 1 netral secara layout/struktur/warna/teks. Perbedaan yang tersisa = re-encode aset + state lazy-load, bukan regresi. **Dinyatakan lolos.**

SHOT ke `.verify/phase1/` (4 route × 3 viewport). Bandingkan **setiap** file dengan `.verify/phase0/`:

```bash
ls .verify/phase0 .verify/phase1
```

Buka berpasangan dan catat perbedaan. Yang **diperbolehkan** berbeda hanya: framing gambar di dalam kartu event/archive bila `ARTWORK[key].position` tidak sama dengan `imagePosition` lama (Task 7 Step 2 poin 3). Apa pun yang lain — warna, spasi, tinggi section, posisi sticker, scrollbar, ikon hilang, teks terpotong — adalah regresi dan **harus diperbaiki sebelum fase 1 dinyatakan selesai**.

Ukur juga overflow horizontal pada 390px untuk keempat route:

```js
document.documentElement.scrollWidth   // harus <= 390
```

Expected: ≤ 390 untuk `/`, `/shadow`, `/mission-control`, `/dock`. Angka ini adalah perbaikan dari sesi sebelumnya (layering + grid eksplisit) dan tidak boleh mundur.

- [x] **Step 6: Matikan server, catat hasil gerbang**

> Server dev 4317 dimatikan (`taskkill //PID … //F //T`, konfirmasi `no listener`). Status fase 1 dicatat di `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` §7 (blok `> Fase 1 selesai 2026-11-11 …`), termasuk catatan jujur soal `event-detail.tsx` 153 baris yang ditunda ke Fase 2.

```bash
netstat -ano | grep :4317
taskkill //PID <pid> //F
```

Tambah di `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md`, tepat setelah baris `**Fase 1** — ...` di §7:

```markdown
> Fase 1 selesai <tanggal>: pipeline hijau (core 7 tes, assets 3 tes), `@source` terbukti
> memancarkan `.18em`, 0 pemakaian `next/*` di `packages/ui`, `scrollWidth` ≤ 390 di 4 route,
> perbandingan `.verify/phase0` vs `.verify/phase1` bersih.
```

- [x] **Step 7: Commit**

> Commit `docs: catat gerbang fase 1 (packaging design system)` — spec §7 (status fase 1) + ledger Task 10. `pnpm-lock.yaml`, `landing.tsx` (WIP duo owner), dan workspace backend (`apps/api`/`errors`/`schema`/`contracts`) sengaja tidak di-stage.

```bash
git add docs/superpowers/specs/2026-11-11-frontend-design-system-design.md
git commit -m "docs: catat gerbang fase 1 (packaging design system)"
```

---

# FASE 2 — Pecah file raksasa (murni pemindahan)

Aturan fase ini: **tidak ada perubahan perilaku, kelas, atau struktur DOM.** Hanya memotong file besar menjadi file kecil dan menyambungnya lagi lewat orkestrator. Perbedaan visual apa pun di fase ini adalah bug.

Nomor baris absolut bergeser setelah fase 1 (Task 7 menghapus ±230 baris dari `dock.tsx`, Task 8 ±210 baris dari `landing.tsx`). Karena itu **lokasi region ditandai oleh komentar `{/* ... */}`**, bukan nomor baris. Ukur ulang sebelum memulai:

```bash
wc -l apps/web/src/components/*.tsx
```

### Task 11: Pecah `landing.tsx` jadi `components/landing/`

**Files:**
- Create: `apps/web/src/components/landing/hero.tsx`
- Create: `apps/web/src/components/landing/signals.tsx`
- Create: `apps/web/src/components/landing/crew.tsx`
- Create: `apps/web/src/components/landing/archive.tsx`
- Create: `apps/web/src/components/landing/about.tsx`
- Create: `apps/web/src/components/landing/footer.tsx`
- Create: `apps/web/src/components/landing/index.tsx` (orkestrator)
- Delete: `apps/web/src/components/landing.tsx`
- Modify: `apps/web/src/app/page.tsx` (import `Landing`)

**Interfaces:**
- Consumes: `SiteNav` dari `../site-nav`; `ArchiveStrip` (dipindah ke `archive.tsx`); komposit `TransmissionCard`, `CrewConstellation`, `Marquee` dari `@moonwitness/ui`; data `timelineEvents`, `witnesses` dari `@/lib/data`.
- Produces:

```ts
// landing/hero.tsx
function Hero(): JSX.Element                       // section id="home"
// landing/signals.tsx
function Signals(): JSX.Element                    // section id="signals", memuat TransmissionCard
// landing/crew.tsx
function Crew(): JSX.Element                       // section id="crew", memuat CrewConstellation
// landing/archive.tsx
function ArchiveStrip(): JSX.Element               // scroller 8 <Link> + next/image (R3)
function Archive(): JSX.Element                    // section id="archive"
// landing/about.tsx
function About(): JSX.Element                      // section id="about"
// landing/footer.tsx
function LandingFooter(): JSX.Element              // footer + nav Footer
// landing/index.tsx
export function Landing(): JSX.Element
```

Setiap section menerima datanya sendiri langsung dari `@/lib/data` — tidak ada prop drilling dari orkestrator, karena `lib/data.ts` adalah modul statis tanpa副作用. Kalau nanti tim backend mengganti `lib/data.ts` dengan fetch, yang berubah adalah tiap file section, bukan orkestrator.

- [ ] **Step 1: Potong per region**

Buka `landing.tsx` dan potong berdasarkan marker:

| region | dari marker | sampai |
|---|---|---|
| `hero.tsx` | `{/* HERO */}` | tepat sebelum `{/* MARQUEE */}` |
| marquee | `{/* MARQUEE */}` | tepat sebelum `{/* SIGNALS / FEATURES */}` — **tetap di orkestrator**, sekarang hanya `<Marquee>` + item |
| `signals.tsx` | `{/* SIGNALS / FEATURES */}` | tepat sebelum `{/* CREW */}` |
| `crew.tsx` | `{/* CREW */}` | tepat sebelum `{/* ARCHIVE */}` |
| `archive.tsx` | `{/* ARCHIVE */}` | tepat sebelum `{/* ABOUT / JOIN */}` + fungsi `ArchiveStrip` |
| `about.tsx` | `{/* ABOUT / JOIN */}` | tepat sebelum `<footer` |
| `footer.tsx` | `<footer` | akhir komponen `Landing` |

Tiap file baru: `"use client"` di baris pertama bila region itu memakai hook/handler (hero, signals, crew, archive hampir pasti ya; about dan footer periksa dulu), lalu import yang dibutuhkan region itu saja — jangan menyalin seluruh blok import `landing.tsx` ke setiap file.

- [ ] **Step 2: Tulis orkestrator**

`apps/web/src/components/landing/index.tsx`:

```tsx
"use client";

import { Marquee, Star4 } from "@moonwitness/ui";
import { SiteNav } from "../site-nav";
import { About } from "./about";
import { Archive } from "./archive";
import { Crew } from "./crew";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { Signals } from "./signals";

const MARQUEE_ITEMS = [
  "SAME MOON",
  "DIFFERENT PEOPLE",
  "BIGGER PERSPECTIVES",
  "ANOTHER SIDE OF REALITY",
  "STORIES KEEP ORBITING",
  "FOLLOW THE SIGNAL",
];

export function Landing() {
  return (
    <div className="relative">
      <SiteNav />
      <Hero />
      <Marquee className="border-y-2 border-[var(--line)] bg-[var(--pink)] py-2.5 font-brush text-lg text-white">
        {MARQUEE_ITEMS.map((t) => (
          <span key={t} className="flex items-center gap-8">
            {t} <Star4 className="h-4 w-4 text-[var(--yellow)]" />
          </span>
        ))}
      </Marquee>
      <Signals />
      <Crew />
      <Archive />
      <About />
      <LandingFooter />
    </div>
  );
}
```

`Star4` diekspor dari root `@moonwitness/ui` (re-export ikon) atau dari `@moonwitness/ui/icons` — pilih `@moonwitness/ui/icons` supaya tidak menambah re-export di `index.ts`:

```tsx
import { Marquee } from "@moonwitness/ui";
import { Star4 } from "@moonwitness/ui/icons";
```

- [ ] **Step 3: Hapus file lama + perbaiki import app**

```bash
git rm apps/web/src/components/landing.tsx
grep -rn "components/landing" apps/web/src
```

`apps/web/src/app/page.tsx` mengimpor `Landing`; karena folder baru punya `index.tsx`, import `@/components/landing` tetap valid tanpa perubahan. Pastikan grep tidak menunjukkan import ke path file lama.

- [ ] **Step 4: Gerbang ukuran file**

```bash
wc -l apps/web/src/components/landing/*.tsx
```

Expected: **setiap** file di bawah 150 baris. Kalau `signals.tsx` atau `hero.tsx` masih di atas 150, potong lagi berdasarkan sub-bagian visualnya (mis. `hero.tsx` → `hero.tsx` + `hero-artwork.tsx` untuk blok `<Image>` + overlay). Jangan memangkas dengan menghapus markup.

- [ ] **Step 5: Pipeline + bukti visual**

```bash
pnpm turbo run lint typecheck build
```

SHOT ke `.verify/phase2-task11/`, bandingkan `.verify/phase1/landing-*.png` (3 viewport). Expected: identik. Periksa juga: marquee masih berjalan dan berhenti saat hover, CountUp masih terpicu saat di-scroll, tombol scroll archive kiri/kanan masih bekerja, semua link nav masih menuju anchor yang benar (`#signals`, `#crew`, `#archive`, `#about`).

`scrollWidth` pada 390px harus tetap ≤ 390. Matikan server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/landing apps/web/src/components/landing.tsx apps/web/src/app/page.tsx
git commit -m "refactor(web): pecah landing.tsx jadi 7 file section"
```

---

### Task 12: Pecah `dock.tsx` jadi `components/dock/`

**Files:**
- Create: `apps/web/src/components/dock/hero.tsx`
- Create: `apps/web/src/components/dock/filter-bar.tsx`
- Create: `apps/web/src/components/dock/event-list.tsx`
- Create: `apps/web/src/components/dock/event-detail-panel.tsx`
- Create: `apps/web/src/components/dock/index.tsx` (orkestrator)
- Delete: `apps/web/src/components/dock.tsx`
- Modify: `apps/web/src/app/dock/page.tsx` bila import berubah

**Interfaces:**
- Consumes: `EraBand`, `EventCard`, `EventDetail` dari `@moonwitness/ui`; `EmpireShell` dari `../shell` (Task 13) atau `../empire-shell` bila Task 13 belum dikerjakan; `timelineEvents`, `eras` dari `@/lib/data`; `useSearchParams` dari `next/navigation`.
- Produces:

```ts
// dock/hero.tsx
function DockHero(): JSX.Element
// dock/filter-bar.tsx
interface FilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  kind: EventKind | "ALL";
  onKindChange: (k: EventKind | "ALL") => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
  resultCount: number;
}
function FilterBar(props: FilterBarProps): JSX.Element
type SortKey = "newest" | "oldest" | "signals"   // salin persis nilai yang sudah ada di dock.tsx
// dock/event-list.tsx
function EventList(props: {
  events: TimelineEvent[];
  view: "grid" | "list";
  selectedId: string | null;
  onOpen: (id: string) => void;
}): JSX.Element
// dock/event-detail-panel.tsx
function EventDetailPanel(props: {
  event: TimelineEvent;
  era: Era;
  relatedEvents: TimelineEvent[];
  shareUrl: string;
  onRelated: (id: string) => void;
  onClose?: () => void;
  variant: "aside" | "drawer";
}): JSX.Element
// dock/index.tsx
export function Dock(): JSX.Element
```

`SortKey` harus disalin dari nilai yang benar-benar ada di `dock.tsx` sekarang — jalankan `grep -n "sort" apps/web/src/components/dock.tsx` dan pakai union yang ada, jangan menebak.

- [ ] **Step 1: Potong per region**

| region | dari marker | sampai |
|---|---|---|
| `hero.tsx` | `{/* HERO */}` | tepat sebelum `{/* FILTER BAR */}` |
| `filter-bar.tsx` | `{/* FILTER BAR */}` | tepat sebelum pita era (`<EraBand`) |
| pita era | `<EraBand` | **tetap di orkestrator** — sudah satu baris komponen |
| `event-list.tsx` | `{/* EVENTS + DETAIL */}` | sampai penutup grid daftar event |
| `event-detail-panel.tsx` | `<aside className="hidden xl:block"` dan `{/* MOBILE/TABLET DETAIL DRAWER */}` | akhir komponen `Dock` |

Semua **state tetap di orkestrator** (`query`, `kind`, `sort`, `view`, `selected`, `origin`, pembacaan `useSearchParams`). Anak-anak terkendali penuh lewat prop. Ini penting: filter dan daftar harus tetap tersinkronisasi, dan memindah state ke anak akan memutus `?event=` dari URL.

- [ ] **Step 2: Orkestrator**

`apps/web/src/components/dock/index.tsx` berisi `"use client"`, semua state + `useEffect` yang membaca `params.get("event")`, fungsi `select(id)`, memo filter, lalu merangkai:

```tsx
<EmpireShell active="dock" breadcrumb="..." search={{ value: query, onChange: setQuery, placeholder: "..." }}>
  <DockHero />
  <FilterBar {...filterProps} />
  <EraBand eras={eras} active={era} onSelect={setEra} />
  <div className="...grid...">
    <EventList events={visibleEvents} view={view} selectedId={selected?.id ?? null} onOpen={select} />
    {selected && selectedEra && (
      <EventDetailPanel variant="aside" event={selected} era={selectedEra} relatedEvents={related} shareUrl={shareUrl(selected.id)} onRelated={select} />
    )}
  </div>
  {selected && selectedEra && (
    <EventDetailPanel variant="drawer" event={selected} era={selectedEra} relatedEvents={related} shareUrl={shareUrl(selected.id)} onRelated={select} onClose={closeDetail} />
  )}
</EmpireShell>
```

`closeDetail` adalah fungsi di orkestrator yang menutup drawer **tanpa** menghapus event terpilih di desktop: salin perilakunya dari `dock.tsx` sekarang (drawer mobile menutup lewat state `drawerOpen`, bukan lewat `selected`). Kalau `dock.tsx` sekarang memakai satu state untuk keduanya, pertahankan apa adanya — fase 2 tidak mengubah perilaku.

Salin prop `EmpireShell` (`active`, `breadcrumb`, `search`) persis dari `dock.tsx` yang sekarang — jangan mengarang breadcrumb baru.

`variant` membedakan pembungkus: `"aside"` = `<aside className="hidden xl:block" aria-label="Event detail">`, `"drawer"` = pembungkus mobile/tablet yang ada sekarang (drawer + backdrop + tombol tutup). Isi `EventDetail`-nya sama.

- [ ] **Step 3: Hapus file lama**

```bash
git rm apps/web/src/components/dock.tsx
grep -rn "components/dock\"" apps/web/src
```

`apps/web/src/app/dock/page.tsx` mengimpor `Dock` — path `@/components/dock` tetap valid karena ada `index.tsx`.

- [ ] **Step 4: Gerbang ukuran + pipeline**

```bash
wc -l apps/web/src/components/dock/*.tsx
pnpm turbo run lint typecheck build
```

Expected: semua < 150 baris; pipeline hijau.

- [ ] **Step 5: Bukti visual + perilaku**

SHOT ke `.verify/phase2-task12/`, bandingkan `.verify/phase1/dock-*.png` (3 viewport) — harus identik.

Lalu uji perilaku yang paling mudah rusak saat state dipindah:
1. Buka `/dock?event=moonwitness-born` → panel detail langsung menampilkan event itu.
2. Ketik di kotak search → daftar menyusut.
3. Klik chip kind `SIGNAL` → hanya event SIGNAL; klik lagi → semua kembali.
4. Ganti sort dan view (grid/list) → daftar berubah sesuai.
5. Klik kartu lain → detail berganti; klik related di dalam detail → detail berganti lagi.
6. Pada 390px: klik kartu → drawer terbuka; klik tutup → drawer tertutup.
7. Klik chip era di `EraBand` → daftar terfilter.

Matikan server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/dock apps/web/src/components/dock.tsx apps/web/src/app/dock
git commit -m "refactor(web): pecah dock.tsx jadi 5 file, state tetap di orkestrator"
```

### Task 13: Pecah `empire-shell.tsx` jadi `components/shell/`

**Files:**
- Create: `apps/web/src/components/shell/nav-items.ts`
- Create: `apps/web/src/components/shell/sidebar.tsx`
- Create: `apps/web/src/components/shell/topbar.tsx`
- Create: `apps/web/src/components/shell/notifications.tsx`
- Create: `apps/web/src/components/shell/profile-menu.tsx`
- Create: `apps/web/src/components/shell/index.tsx` (orkestrator `EmpireShell`)
- Delete: `apps/web/src/components/empire-shell.tsx`

**Interfaces:**
- Consumes: `roleLabel` dari `@/lib/auth` (**hanya dibaca, tidak diubah** — Global Constraints), `feedItems` dari `@/lib/data`, `useRouter` dari `next/navigation`, `Link` dari `next/link`, ikon dari `@moonwitness/ui/icons`.
- Produces (dipakai Task 21 saat sidebar diperluas ke 10 item):

```ts
// shell/nav-items.ts
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;          // path stroke SVG, sama seperti sekarang
}
export const navItems: NavItem[];   // 9 item, salin persis dari empire-shell.tsx:10-65

// shell/sidebar.tsx
function Sidebar(props: {
  items: NavItem[];
  active: string;
  onNavigate?: () => void;      // menutup sidebar mobile setelah klik
}): JSX.Element

// shell/topbar.tsx
function Topbar(props: {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  onOpenSidebar: () => void;
  identity: string;
  role: string;
  onExit: () => void;
  notifications: ReactNode;      // slot: <Notifications/> dirender orkestrator
  profileMenu: ReactNode;        // slot: <ProfileMenu/> dirender orkestrator
}): JSX.Element

// shell/notifications.tsx
function Notifications(props: { open: boolean; onToggle: () => void; onClear: () => void }): JSX.Element
// shell/profile-menu.tsx
function ProfileMenu(props: { open: boolean; onToggle: () => void; identity: string; role: string; onExit: () => void }): JSX.Element

// shell/index.tsx
export function EmpireShell(props: {
  active: string;
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  children: ReactNode;
}): JSX.Element
```

Signature publik `EmpireShell` **tidak berubah** — tiga halaman (`/dock`, `/mission-control`, dan apa pun yang memakainya) tidak perlu disentuh.

- [ ] **Step 1: Ekstrak `nav-items.ts`**

Salin `empire-shell.tsx:10-65` apa adanya (9 objek dengan `id`, `label`, `href`, `icon`) ke `shell/nav-items.ts` dengan tipe `NavItem` di atas. Jangan mengubah label, href, atau path ikon — Task 21 yang memperluas daftar ini.

- [ ] **Step 2: Potong sidebar**

Region `<nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Empire">` (baris 131) sampai penutupnya, **plus** dua pembungkusnya: `<aside className="fixed inset-y-0 left-0 z-40 hidden w-60 ... lg:block">` (178) dan aside mobile (185). Jadi `sidebar.tsx` merender satu `<nav>` dan orkestrator yang memutuskan membungkusnya dengan aside desktop atau drawer mobile.

Perilaku yang harus ikut pindah apa adanya: `aria-current`/kelas aktif berdasarkan `active`, klik item di mobile menutup drawer (`onNavigate`).

- [ ] **Step 3: Potong topbar + popover**

Region `<header className="sticky top-0 z-30 flex h-14 ...">` (192) sampai penutupnya menjadi `topbar.tsx`. Dua popover di dalamnya dipisah:

- `notifications.tsx` = tombol lonceng + panel daftar `feedItems` + tombol clear.
- `profile-menu.tsx` = tombol identitas + panel `identity`/`role` + tombol exit.

State `notifOpen`/`profileOpen` **tetap di orkestrator**, begitu pula `popRef` + `useEffect` klik-di-luar (`empire-shell.tsx:100-108`) yang menutup keduanya. Efek itu menyentuh DOM kedua popover, jadi memindahkannya ke anak akan memutus perilaku "klik di luar menutup menu".

```tsx
// orkestrator, pertahankan apa adanya
useEffect(() => {
  function onClick(e: MouseEvent) {
    if (popRef.current && !popRef.current.contains(e.target as Node)) {
      setNotifOpen(false);
      setProfileOpen(false);
    }
  }
  document.addEventListener("mousedown", onClick);
  return () => document.removeEventListener("mousedown", onClick);
}, []);
```

`popRef` diteruskan ke `Topbar` sebagai prop `containerRef` bila diperlukan — tambahkan ke signature `Topbar`:

```ts
  containerRef: React.RefObject<HTMLDivElement | null>;
```

- [ ] **Step 4: Orkestrator**

`shell/index.tsx` berisi `"use client"`, semua state (`sidebarOpen`, `notifOpen`, `profileOpen`, `identity`, `role`), kedua `useEffect` (baca `mw-session` + klik-di-luar), `exitShadow()`, lalu merangkai aside desktop, drawer mobile, `Topbar`, `<main className="min-w-0 flex-1">{children}</main>`, dan `<footer>` (340-348).

Footer **tetap di orkestrator** (8 baris, tidak layak jadi file sendiri).

Baca session jangan diubah satu karakter pun:

```tsx
const raw = localStorage.getItem("mw-session") ?? sessionStorage.getItem("mw-session");
const session = JSON.parse(raw) as { identity?: string; role?: string };
if (session.identity) setIdentity(session.identity);
if (session.role) setRole(roleLabel(session.role));
```

- [ ] **Step 5: Hapus file lama**

```bash
git rm apps/web/src/components/empire-shell.tsx
grep -rn "empire-shell" apps/web/src
```

Expected setelah selesai: 0 baris. Pemakai (`dock/index.tsx`, `mission-control.tsx`) mengimpor `EmpireShell` dari `@/components/shell` — perbarui dua import itu.

- [ ] **Step 6: Gerbang ukuran + pipeline**

```bash
wc -l apps/web/src/components/shell/*.tsx apps/web/src/components/shell/*.ts
pnpm turbo run lint typecheck build
```

Expected: semua < 150 baris; pipeline hijau.

- [ ] **Step 7: Bukti visual + perilaku**

SHOT `.verify/phase2-task13/` untuk `/dock` dan `/mission-control` (3 viewport), bandingkan `.verify/phase1/`. Harus identik.

Uji perilaku shell:
1. 390px: buka hamburger → drawer sidebar muncul; klik satu item → drawer tertutup dan navigasi terjadi.
2. 1440px: klik lonceng → panel notifikasi terbuka; klik di luar panel → tertutup.
3. Klik avatar → menu profil terbuka, menampilkan `identity` dan `role` dari session (login dulu sebagai `admin` → harus tampil `Empire Admin` dan `Admin // Empire`).
4. Klik exit → kembali ke `/shadow`.
5. Item sidebar yang aktif punya penanda visual yang sama seperti sebelumnya.

Matikan server.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/shell apps/web/src/components/empire-shell.tsx apps/web/src/components/dock/index.tsx apps/web/src/components/mission-control.tsx
git commit -m "refactor(web): pecah empire-shell jadi sidebar/topbar/notifications/profile-menu"
```

---

### Task 13b: Pecah `site-nav.tsx` jadi `components/site-nav/`

Spec §7 tidak mendaftar `site-nav.tsx` di tabel pemecahan, tapi gerbang §7 ("setiap file komponen < 150 baris") berlaku untuk semua file — dan `site-nav.tsx` sekarang **181 baris**. Tanpa task ini, Task 14 Step 1 pasti merah. Sufiks `b` dipakai supaya nomor Task 14-31 tidak bergeser; puluhan rujukan silang di dokumen ini bergantung pada nomor itu.

**Files:**
- Create: `apps/web/src/components/site-nav/links.ts`
- Create: `apps/web/src/components/site-nav/mobile-menu.tsx`
- Create: `apps/web/src/components/site-nav/search-dialog.tsx`
- Create: `apps/web/src/components/site-nav/index.tsx` (orkestrator)
- Delete: `apps/web/src/components/site-nav.tsx`
- Modify: `apps/web/src/components/landing/index.tsx` (impor `../site-nav` tetap sah — yang diimpor foldernya, bukan filenya)

**Interfaces:**
- Consumes: `useRouter` dari `next/navigation`, `Link` dari `next/link`, `Crown`/`SearchIcon`/`GlobeIcon` dari `@moonwitness/ui/icons`, `Wordmark` **belum ada** di task ini (datang di Task 29).
- Produces:

```ts
// site-nav/links.ts
export interface NavLink { id: string; label: string }
export const links: NavLink[];        // 5 item, salin persis dari site-nav.tsx:8-14

// site-nav/mobile-menu.tsx
function MobileMenu(props: {
  links: NavLink[];
  active: string;
  onSelect: (id: string) => void;     // pilih section di orkestrator
  onClose: () => void;                // tutup menu di orkestrator
}): JSX.Element

// site-nav/search-dialog.tsx
function SearchDialog(props: {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}): JSX.Element

// site-nav/index.tsx
export function SiteNav(): JSX.Element
```

Signature publik `SiteNav` tidak berubah, jadi `landing/index.tsx` tidak perlu disentuh sama sekali — `import { SiteNav } from "../site-nav"` menyelesaikan ke `site-nav/index.tsx` setelah `site-nav.tsx` dihapus. **Hapus keduanya dalam satu commit**, kalau tidak Node akan memilih file `.tsx` dan folder baru jadi kode mati.

- [ ] **Step 1: `links.ts`**

Pindahkan array `links` dari `site-nav.tsx:8-14` apa adanya, tambah tipe ekspor supaya `MobileMenu` tidak perlu menebak bentuknya:

```ts
export interface NavLink {
  id: string;
  label: string;
}

export const links: NavLink[] = [
  { id: "home", label: "HOME" },
  { id: "signals", label: "SIGNALS" },
  { id: "archive", label: "ARCHIVE" },
  { id: "crew", label: "CREW" },
  { id: "about", label: "ABOUT" },
];
```

`id` di sini adalah **id section di landing** — dipakai `IntersectionObserver` dan `href="#…"`. Jangan mengubah nilainya.

- [ ] **Step 2: `mobile-menu.tsx`**

Pindahkan `site-nav.tsx:119-143` apa adanya. Tiga perubahan: `links` jadi prop, dan `setActive`+`setMenuOpen` dipecah jadi dua callback terpisah (`onSelect` = pilih section, `onClose` = tutup menu). Keduanya dipisah karena niatnya memang dua; memakai `onSelect("")` sebagai "tutup menu" akan membuat `active` bisa bernilai `""` dan itu membingungkan saat dibaca.

```tsx
import Link from "next/link";
import type { NavLink } from "./links";

export interface MobileMenuProps {
  links: NavLink[];
  active: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function MobileMenu({ links, active, onSelect, onClose }: MobileMenuProps) {
  return (
    <nav
      className="border-t border-[var(--line)] bg-[var(--ink)] px-4 py-3 lg:hidden"
      aria-label="Mobile"
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={() => {
            onSelect(link.id);
            onClose();
          }}
          className={`block px-2 py-2.5 font-brush text-lg ${active === link.id ? "text-[var(--pink)]" : "text-zinc-200"}`}
        >
          {link.label}
        </a>
      ))}
      <Link href="/shadow" onClick={onClose} className="btn-zine mt-2 px-5 py-2.5 text-base">
        JOIN THE CREW →
      </Link>
    </nav>
  );
}
```

- [ ] **Step 3: `search-dialog.tsx`**

Pindahkan `site-nav.tsx:148-177` (elemen `<div>` dialog saja; kondisional `{searchOpen && …}` di baris 147 dan 178 tetap di orkestrator). Backdrop dan `stopPropagation` ikut pindah karena keduanya bagian dari dialog, bukan dari orkestrator:

```tsx
export interface SearchDialogProps {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function SearchDialog({ query, onQueryChange, onSubmit, onClose }: SearchDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-28 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="zine-card-rough w-full max-w-xl p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search the archive"
      >
        <label htmlFor="nav-search" className="font-brush text-lg text-[var(--yellow)]">
          SEARCH THE SIGNALS
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="nav-search"
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="stories, signals, people, places…"
            className="zine-input rounded-md px-4 py-3 text-sm"
          />
          <button type="submit" className="btn-zine px-5 py-2 text-sm">
            GO
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Searches the Dock timeline chronicle.</p>
      </form>
    </div>
  );
}
```

Komponen ini tidak perlu `"use client"` sendiri — tidak ada hook di dalamnya, dan ia hanya pernah dirender dari `index.tsx` yang sudah client.

- [ ] **Step 4: `index.tsx` (orkestrator)**

State dan `IntersectionObserver` (`site-nav.tsx:17-42`) tetap di sini; `submitSearch` juga, karena ia memakai `router` dan `query`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, SearchIcon, GlobeIcon } from "@moonwitness/ui/icons";
import { links } from "./links";
import { MobileMenu } from "./mobile-menu";
import { SearchDialog } from "./search-dialog";

export function SiteNav() {
  const router = useRouter();
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const link of links) {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    router.push(query.trim() ? `/dock?q=${encodeURIComponent(query.trim())}` : "/dock");
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-[var(--line)] bg-[rgba(11,11,16,0.88)] backdrop-blur-md">
        {/* isi: salin persis site-nav.tsx:48-116 (baris brand, nav desktop, tombol search,
            link /mission-control, link /shadow, tombol hamburger) */}

        {menuOpen && (
          <MobileMenu
            links={links}
            active={active}
            onSelect={setActive}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </header>

      {searchOpen && (
        <SearchDialog
          query={query}
          onQueryChange={setQuery}
          onSubmit={submitSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
```

Isi `<header>` disalin verbatim dari `site-nav.tsx:48-116`, dengan dua penyesuaian: ikon diimpor dari `@moonwitness/ui/icons` (Task 5 sudah memindahkannya, jadi impor lama `./zine` sudah tidak ada), dan tombol hamburger tetap memanggil `setMenuOpen((v) => !v)` di orkestrator. Jangan merapikan kelasnya — fase 2 harus netral secara visual.

`MobileMenu` **wajib tetap di dalam `<header>`**, persis seperti DOM lama (`site-nav.tsx:118-144` ada di dalam `<header>` yang menutup di baris 145). Memindahkannya ke luar `<header>` mengubah tampilan: `border-t`-nya tidak lagi menempel ke baris brand dan menu tidak lagi ikut `backdrop-blur-md`. Gerbang Task 14 Step 3 menuntut `.verify/phase1` dan `.verify/phase2` identik, jadi ini bukan soal selera. `SearchDialog` sebaliknya tetap **di luar** `<header>` — memang begitu di DOM lama (baris 147).

- [ ] **Step 5: Hapus file lama, pipeline, bukti visual**

```bash
git rm apps/web/src/components/site-nav.tsx
grep -rn "components/site-nav\"\|from \"./site-nav\"\|from \"../site-nav\"" apps/web/src
wc -l apps/web/src/components/site-nav/*.ts*
pnpm turbo run lint typecheck build
```

Expected: grep hanya menemukan impor di `landing/index.tsx` (yang tetap sah); tidak ada file ≥ 150 baris (`index.tsx` ~105, `search-dialog.tsx` ~45, `mobile-menu.tsx` ~40, `links.ts` ~12); pipeline hijau.

Start produksi, buka `/` di 1440x900 dan 390x844:
1. Scroll → item nav menyala bergantian (observer masih jalan).
2. Klik SEARCH → dialog terbuka, `Esc`/klik backdrop menutup, submit ke `/dock?q=`.
3. Di 390px: hamburger membuka menu mobile, klik item → menu tertutup dan halaman scroll ke section.
4. `JOIN THE CREW →` di menu mobile menutup menu dan pindah ke `/shadow`.

```bash
SHOT phase2-task13b
```

Bandingkan `.verify/phase1/landing-*.png`: **identik**.

Matikan server, lalu commit:

```bash
git add apps/web/src/components/site-nav
git commit -m "refactor(web): pecah site-nav jadi folder, signature SiteNav tetap"
```

`git rm` di awal sudah men-stage penghapusan `site-nav.tsx`, jadi ikut ter-commit di sini.

---

### Task 14: Gerbang fase 2

**Files:**
- Modify: `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (catatan gerbang fase 2 di §7)

**Interfaces:**
- Consumes: hasil Task 11-13b; `.verify/phase1/` sebagai pembanding.
- Produces: `.verify/phase2/` — pembanding untuk fase 3 (di fase 3 perbedaan **sengaja** baru boleh muncul).

- [ ] **Step 1: Buktikan tidak ada file komponen di atas 150 baris**

```bash
find apps/web/src/components packages/ui/src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```

Expected: tidak ada baris (kecuali total) dengan angka ≥ 150. `packages/ui/src/base.css` bukan `.tsx` jadi tidak ikut; kalau ada file TS/TSX di atas 150, pecah lagi sekarang — gerbang §7 eksplisit soal ini.

- [ ] **Step 2: Pipeline penuh**

```bash
pnpm turbo run lint typecheck build && pnpm --filter @moonwitness/core test && pnpm --filter @moonwitness/assets test
```

Expected: hijau; core tetap 7 tes, assets 3 tes.

- [ ] **Step 3: Perbandingan visual 3 viewport**

SHOT `.verify/phase2/` (4 route × 3 viewport), bandingkan dengan `.verify/phase1/`. Expected: **identik**. Fase 2 adalah pemindahan murni; satu piksel pun berbeda berarti ada kelas atau struktur DOM yang ikut berubah saat memotong.

Ukur `scrollWidth` pada 390px untuk keempat route: harus ≤ 390.

- [ ] **Step 4: Matikan server + catat gerbang**

Tambah setelah baris `**Fase 2** — ...` di §7:

```markdown
> Fase 2 selesai <tanggal>: tidak ada file komponen ≥ 150 baris, pipeline hijau,
> `.verify/phase1` vs `.verify/phase2` identik di 4 route × 3 viewport, `scrollWidth` ≤ 390.
```

```bash
git add docs/superpowers/specs/2026-11-11-frontend-design-system-design.md
git commit -m "docs: catat gerbang fase 2 (pemecahan file)"
```

---

# FASE 3 — Polish UX/a11y + performa gambar

Mulai fase ini **perbedaan visual yang disengaja boleh muncul**. Setiap task tetap harus menyebut perubahan apa yang memang diniatkan, supaya pembanding screenshot bisa dibaca.

### Task 15: Skip link + landmark

**Files:**
- Create: `packages/ui/src/primitives/skip-link.tsx`
- Modify: `packages/ui/src/index.ts` (export `SkipLink`)
- Modify: `apps/web/src/app/layout.tsx` (render `<SkipLink />` sebagai anak pertama `<body>`)
- Modify: `apps/web/src/components/shell/index.tsx` (`<main>` → `<main id="main">`)
- Modify: `apps/web/src/app/shadow/page.tsx` (`<main>` → `<main id="main">`)
- Modify: `apps/web/src/components/landing/index.tsx` (bungkus section dengan `<main id="main">`)

**Interfaces:**
- Consumes: `cn` dari `../cn`.
- Produces: `function SkipLink(props: { href?: string; children?: ReactNode }): JSX.Element` — default `href="#main"`, teks default `"Skip to content"`.

- [ ] **Step 1: Tulis `skip-link.tsx`**

```tsx
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
}

/** Tidak pakai next/link: ini anchor ke fragment di halaman yang sama. */
export function SkipLink({ href = "#main", children = "Skip to content", className, ...props }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]",
        "focus:rounded-md focus:bg-[var(--yellow)] focus:px-4 focus:py-3",
        "focus:font-brush focus:text-black focus:shadow-[4px_4px_0_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
```

- [ ] **Step 2: Pasang di layout + beri `id="main"` di tiap halaman**

`apps/web/src/app/layout.tsx`:

```tsx
import { SkipLink } from "@moonwitness/ui";
// ...
      <body className="min-h-screen antialiased">
        <SkipLink />
        {children}
      </body>
```

Tiga target `id="main"`:
- `components/shell/index.tsx`: `<main className="min-w-0 flex-1">` → `<main id="main" className="min-w-0 flex-1">`
- `app/shadow/page.tsx`: `<main className="relative z-10 mx-auto ...">` → tambah `id="main"`
- `components/landing/index.tsx`: bungkus `<Hero/> … <LandingFooter/>`? **Tidak** — footer tidak boleh ada di dalam `<main>`. Bungkus hanya section konten:

```tsx
      <Hero />
      <main id="main">
        <Marquee …>{…}</Marquee>
        <Signals />
        <Crew />
        <Archive />
        <About />
      </main>
      <LandingFooter />
```

`Hero` dibiarkan di luar `<main>` karena ia berisi nav-adjacent artwork; kalau lebih suka hero di dalam main, pindahkan `<Hero/>` ke dalam dan pastikan `SiteNav` tetap di luar. Pilih satu dan tulis alasannya di commit message.

- [ ] **Step 3: Uji dengan keyboard**

```bash
pnpm --filter @moonwitness/web build && pnpm --filter @moonwitness/web start -p 4317 &
```

Untuk tiap route (`/`, `/shadow`, `/mission-control`, `/dock`):
1. Fokus awal di halaman → tekan `Tab` sekali → skip link **terlihat** (kuning, kiri atas) dan `document.activeElement.textContent` = `Skip to content`.
2. Tekan `Enter` → fokus pindah ke `<main id="main">`; scroll posisi mengikuti.
3. Tekan `Tab` lagi → fokus masuk ke elemen pertama di dalam main, bukan kembali ke atas.
4. Pastikan `<main>` tidak membuat perubahan visual: bandingkan screenshot dengan `.verify/phase2/` — harus identik.

Verifikasi programatik bahwa tiap route punya tepat satu landmark `main`:

```js
document.querySelectorAll("main").length          // 1
document.querySelector("main")?.id                // "main"
document.querySelectorAll("header,nav,footer").length  // >= 1 tiap jenis
```

- [ ] **Step 4: Pipeline + commit**

Matikan server (`netstat -ano | grep :4317` → `taskkill //PID <pid> //F`), lalu:

```bash
pnpm turbo run lint typecheck build
git add packages/ui/src apps/web/src/app/layout.tsx apps/web/src/app/shadow/page.tsx apps/web/src/components/shell/index.tsx apps/web/src/components/landing/index.tsx
git commit -m "feat(a11y): skip link + landmark main di semua route"
```

---

### Task 16: Target sentuh 44px, `aria-current`, dan cincin fokus global

**Files:**
- Modify: `packages/ui/src/base.css` (satu aturan `:focus-visible` global di **awal** `@layer components`)
- Modify: `packages/ui/src/composites/crew-constellation.tsx` (hit area witness dot)
- Modify: `apps/web/src/components/landing/archive.tsx` (tombol scroll)
- Modify: `apps/web/src/components/shell/{sidebar,topbar,notifications,profile-menu}.tsx`
- Modify: `apps/web/src/components/site-nav/{index,mobile-menu}.tsx` (hasil Task 13b)
- Modify: `apps/web/src/components/dock/{filter-bar,event-list}.tsx`

**Interfaces:**
- Consumes: hasil Task 11-13b (nama file section sudah terpecah).
- Produces: tidak ada ekspor baru. Perubahan kelas saja.

- [ ] **Step 1: Audit dulu, jangan menebak**

```bash
grep -rn "h-8 w-8\|h-7 w-7\|h-9 w-9\|px-3 py-1.5\|px-2 py-1\b" apps/web/src/components packages/ui/src
```

Catat setiap tombol/link interaktif yang tinggi atau lebarnya < 44px. Yang sudah dipetakan dari pembacaan kode: witness dot (`h-8 w-8` = 32px) di `crew-constellation.tsx`, tombol scroll archive (`px-3 py-1.5` ≈ 30px), chip kind/era di `dock/filter-bar.tsx`, item nav di `shell/sidebar.tsx`, tombol ikon di `shell/topbar.tsx`, tombol hamburger + link nav desktop di `site-nav/index.tsx`, dan link nav di `site-nav/mobile-menu.tsx` (`py-2.5` + `text-lg` ≈ 42px, cek ulang, jangan diasumsikan).

- [ ] **Step 2: Perbesar hit area tanpa mengubah tampilan**

Untuk elemen yang ukurannya bagian dari desain (witness dot 32px), pakai pseudo-element sebagai area sentuh:

```tsx
// crew-constellation.tsx — tombol witness dot
className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 … after:absolute after:-inset-1.5 after:content-[""] ${…}`}
```

`-inset-1.5` = 6px ke tiap arah → 32 + 12 = 44px. Tampilan tidak berubah sama sekali.

Untuk elemen yang boleh tumbuh (tombol scroll, chip, item nav, tombol ikon), pakai ukuran minimum:

```tsx
// landing/archive.tsx — tombol ← dan →
className="zine-card min-h-11 min-w-11 px-3 py-1.5 text-zinc-300 hover:text-[var(--pink)]"

// dock/filter-bar.tsx — chip kind & sort
className="… min-h-11 px-3 …"        // hanya di breakpoint kecil bila tampilan desktop harus tetap rapat:
className="… max-lg:min-h-11 px-3 …"

// shell/sidebar.tsx — item nav
className="… min-h-11 …"

// shell/topbar.tsx, site-nav/index.tsx (hamburger + search) — tombol ikon
className="… min-h-11 min-w-11 …"

// site-nav/mobile-menu.tsx — link nav di menu mobile
className="… min-h-11 …"
```

Pilih `min-h-11` polos bila perubahan tinggi di desktop masih terlihat wajar (sidebar, topbar, tombol scroll); pilih `max-lg:min-h-11` bila rapatnya chip di desktop adalah bagian dari tampilan (filter bar dock). Tulis pilihan itu di commit message.

- [ ] **Step 3: Cincin fokus global**

Tambah di `packages/ui/src/base.css`, sebagai aturan **pertama di dalam** `@layer components` (sebelum `.font-brush`), supaya aturan yang lebih spesifik seperti `.btn-zine:focus-visible` tetap menang:

```css
  /* Cincin fokus dasar. Aturan komponen yang lebih spesifik menimpanya;
     utility Tailwind (focus:outline-none) menang karena layer di atasnya. */
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [tabindex]:focus-visible {
    outline: 3px solid var(--yellow);
    outline-offset: 2px;
  }
```

- [ ] **Step 4: `aria-current` pada navigasi**

```bash
grep -rn "aria-current" apps/web/src packages/ui/src
```

Kondisi sekarang: `shell/sidebar.tsx` (hasil Task 13, asalnya `empire-shell.tsx:137`) **sudah** punya `aria-current={active === item.id ? "page" : undefined}` — pastikan ia tidak hilang saat Task 21 mengganti sumber `active` jadi `activeByPath(pathname)`. Yang perlu ditambah:

- `site-nav/index.tsx` (link nav desktop) dan `site-nav/mobile-menu.tsx` (link nav mobile) — keduanya belum punya penanda section aktif. State `active` dari `IntersectionObserver` tinggal di orkestrator `index.tsx` (Task 13b), dan `MobileMenu` menerimanya sebagai prop `active`. Tambahkan pada link yang `id`-nya sama di kedua tempat:

```tsx
aria-current={active === link.id ? "true" : undefined}
```

Pakai `"true"` (bukan `"page"`) karena yang ditandai adalah section di halaman yang sama, bukan halaman lain.

- `dock/filter-bar.tsx` — chip kind/era yang sedang dipilih:

```tsx
aria-pressed={kind === k}
```

Chip filter adalah toggle, jadi `aria-pressed` lebih tepat daripada `aria-current`.

- [ ] **Step 5: Verifikasi di browser**

Build + start, lalu untuk tiap route pada 390x844:

```js
// semua target interaktif >= 44px
[...document.querySelectorAll("a,button,input,select,[tabindex]")]
  .filter((el) => el.offsetParent !== null)
  .map((el) => ({ t: el.textContent?.trim().slice(0, 24) || el.getAttribute("aria-label"), w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }))
  .filter((x) => x.w < 44 || x.h < 44)
```

Expected: array kosong, **kecuali** elemen yang memang bukan target sentuh (mis. `<span>` bertabindex, atau teks di dalam link yang diukur sendiri). Setiap sisa harus dijelaskan, bukan diabaikan.

Lalu uji keyboard: `Tab` melalui `/mission-control` — setiap elemen fokus punya cincin kuning terlihat, dan tidak ada elemen yang bisa difokuskan tapi tidak terlihat cincinnya.

Ambil SHOT ke `.verify/phase3-task16/` dan bandingkan `.verify/phase2/`: perbedaan yang **diniatkan** adalah tinggi chip/tombol/item nav. Perbedaan lain (dot witness membesar, layout bergeser) = bug.

- [ ] **Step 6: Pipeline + commit**

```bash
pnpm turbo run lint typecheck build
git add packages/ui/src apps/web/src/components
git commit -m "feat(a11y): target sentuh 44px, cincin fokus global, aria-current nav"
```

### Task 17: Performa gambar — satu sumber kebenaran + tuning optimizer

Kondisi yang sudah benar dan **tidak perlu diubah**: tepat satu `priority` per halaman (`landing/hero.tsx`, `dock/hero.tsx`, `shadow/page.tsx:60`, `command-center`/`mission-control.tsx:248`) dan semua 15 `next/image` sudah punya `sizes`.

**Files:**
- Modify: `apps/web/next.config.ts` (blok `images`)
- Modify: `apps/web/src/components/landing/{hero,signals,crew,about}.tsx` (path literal → `artSrc`)
- Modify: `apps/web/src/components/dock/hero.tsx`
- Modify: `apps/web/src/components/dock/index.tsx` (5 path literal di pita era, hasil pecahan Task 12)
- Modify: `apps/web/src/components/mission-control.tsx` (blok `<Image>` di baris ±245; `priority`-nya di 248)
- Modify: `apps/web/src/app/shadow/page.tsx` (blok `<Image>` di baris ±57; `priority`-nya di 60, **hanya `src`** — jangan sentuh logika login)

**Interfaces:**
- Consumes: `artSrc(key: ArtKey): string` dari `apps/web/src/lib/art.ts` (Task 3), `ARTWORK` dari `@moonwitness/assets`.
- Produces: tidak ada ekspor baru. Setelah task ini, `grep -rn '"/art/' apps/web/src` menghasilkan **0 baris**.

- [ ] **Step 1: Tuning optimizer Next**

`apps/web/next.config.ts` — tambah blok `images` sehingga lebar yang dihasilkan optimizer sama dengan `ART_WIDTHS` di manifest (480/960/1440/1920), bukan default Next yang melompat ke 2048/3840:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@moonwitness/ui",
    "@moonwitness/core",
    "@moonwitness/types",
    "@moonwitness/assets",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 960, 1440, 1920],
    imageSizes: [240, 480],
    minimumCacheTTL: 31_536_000,
  },
};

export default nextConfig;
```

Pertahankan field lain yang sudah ada di file itu (baca dulu, jangan menimpa). `deviceSizes` yang lebih sempit berarti browser di layar 2560px mendapat 1920w — itu sengaja: sumber aslinya memang artwork 1920px, memperbesarnya tidak menambah detail.

- [ ] **Step 2: Ganti semua path literal**

Hari ini ada **14** situs yang menulis path mentah (`grep -rn '"/art/' apps/web/src` di atas kode asli). Satu di antaranya hilang sebelum task ini: `landing.tsx:36` ada di dalam `TransmissionCard`, yang dipindah ke `packages/ui` oleh Task 8 dan di sana memakai manifest lewat `ZineImage` (R6), bukan path literal. Sisanya **13**, dan setelah fase 2 mereka tinggal di file-file ini:

| file (nama setelah fase 2) | asalnya | path literal | ganti jadi |
|---|---|---|---|
| `landing/hero.tsx` | `landing.tsx:299` | `/art/hero-witness.png` | `artSrc("hero-witness")` |
| `landing/signals.tsx` (2 situs) | `landing.tsx:400`, `:427` | `/art/crew-rooftop.png`, `/art/city-shadow.png` | `artSrc("crew-rooftop")`, `artSrc("city-shadow")` |
| `landing/crew.tsx` | `landing.tsx:478` | `/art/crew-rooftop.png` | `artSrc("crew-rooftop")` |
| `landing/about.tsx` | `landing.tsx:515` | `/art/crew-rooftop.png` | `artSrc("crew-rooftop")` |
| `dock/hero.tsx` | `dock.tsx:283` | `/art/crew-rooftop.png` | `artSrc("crew-rooftop")` |
| `dock/index.tsx` (5 situs di pita era) | `dock.tsx` blok `{/* ERA BAND */}`, `:410`, `:412`, `:414`, `:416`, `:417` | rantai ternary `e.id === … ? "/art/x.png"` | ternary yang menghasilkan `ArtKey`, dibungkus sekali: `src={artSrc(e.id === "fracture" ? "signal-tunnel" : e.id === "origins" ? "city-shadow" : e.id === "neon" ? "hero-witness" : e.id === "rebuilding" ? "city-shadow" : "crew-rooftop")}` |
| `mission-control.tsx` | `mission-control.tsx:245` | `/art/city-shadow.png` | `artSrc("city-shadow")` |
| `shadow/page.tsx` | `shadow/page.tsx:57` | `/art/city-shadow.png` | `artSrc("city-shadow")` |

Delapan baris tabel = 13 situs (satu baris `landing/signals.tsx` dihitung dua, satu baris pita era dihitung lima).

`landing/archive.tsx` dan `landing/footer.tsx` **tidak** punya path literal — `ArchiveStrip` memakai `ev.image` (sudah `ArtKey`, dibungkus `artSrc` di Task 1 Step 7).

Jalankan grep ulang untuk menemukan sisa yang tidak tercantum di tabel (nama file bisa bergeser setelah fase 2):

```bash
grep -rn '"/art/' apps/web/src
```

Expected setelah selesai: **0 baris**. Tambah `import { artSrc } from "@/lib/art";` di tiap file yang berubah.

Jangan mengubah `alt`, `sizes`, `priority`, atau `style` di situs-situs itu — task ini hanya menyeragamkan sumber path.

- [ ] **Step 3: Pastikan pipeline optimasi sudah dijalankan**

```bash
ls apps/web/public/art/*.avif | wc -l
```

Expected: 16 file (4 artwork × 4 lebar). `shadow-command` menyusul di Task 19. Kalau 0, jalankan `pnpm --filter @moonwitness/assets optimize`.

- [ ] **Step 4: Ukur byte yang benar-benar dikirim**

```bash
pnpm --filter @moonwitness/web build && pnpm --filter @moonwitness/web start -p 4317 &
```

Buka `/` di 1440x900 dengan network recording, lalu jalankan di console:

```js
performance.getEntriesByType("resource")
  .filter((r) => /\/art\/|_next\/image/.test(r.name))
  .map((r) => ({ url: r.name.split("/").slice(-2).join("/"), kb: Math.round((r.transferSize ?? 0) / 1024) }))
  .sort((a, b) => b.kb - a.kb)
```

Expected: gambar terbesar < 400 KB. Catat tiga angka teratas — dipakai lagi di Task 18.

Ulangi pada 390x844: gambar hero harus turun drastis (srcset memilih 480w).

Matikan server.

- [ ] **Step 5: Pipeline + bukti visual + commit**

```bash
pnpm turbo run lint typecheck build
```

SHOT `.verify/phase3-task17/` dan bandingkan `.verify/phase2/`. Perbedaan yang **diniatkan**: tidak ada di tampilan — hanya byte yang berubah. Kalau ada gambar yang tampak lebih kabur, `deviceSizes` terlalu sempit untuk penempatan itu; naikkan `sizes`-nya atau kembalikan 2048 ke `deviceSizes` dan catat alasannya.

```bash
git add apps/web/next.config.ts apps/web/src
git commit -m "perf(web): path artwork lewat manifest + tuning optimizer gambar"
```

---

### Task 18: Gerbang fase 3 (Lighthouse, LCP, console, reduced-motion)

**Files:**
- Modify: `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (catatan gerbang fase 3 di §7)
- Create: `.verify/phase3/lh-*.json` (tidak di-commit)

**Interfaces:**
- Consumes: hasil Task 15-17.
- Produces: angka terukur yang jadi pembanding fase 4 dan 5.

- [ ] **Step 1: Build + start produksi**

```bash
pnpm --filter @moonwitness/web build
pnpm --filter @moonwitness/web start -p 4317 &
```

- [ ] **Step 2: Lighthouse untuk `/` dan `/mission-control`**

```bash
mkdir -p .verify/phase3
npx --yes lighthouse@12 http://localhost:4317/ --only-categories=performance --form-factor=mobile --screenEmulation.disabled --output=json --output-path=.verify/phase3/lh-landing-mobile.json --chrome-flags="--headless=new" --quiet
npx --yes lighthouse@12 http://localhost:4317/mission-control --only-categories=performance --form-factor=mobile --screenEmulation.disabled --output=json --output-path=.verify/phase3/lh-mc-mobile.json --chrome-flags="--headless=new" --quiet
```

Baca skornya:

```bash
node -e "for (const f of ['landing','mc']) { const r = JSON.parse(require('fs').readFileSync('.verify/phase3/lh-'+f+'-mobile.json','utf8')); console.log(f, 'perf=', Math.round(r.categories.performance.score*100), 'LCP=', r.audits['largest-contentful-paint'].displayValue, 'bytes=', r.audits['total-byte-weight'].displayValue); }"
```

Expected: `perf >= 85` untuk keduanya, `bytes < 1 MB` (§5). Kalau di bawah 85, jalankan sekali lagi untuk memisahkan variasi mesin dari regresi nyata, lalu perbaiki penyebab terbesar yang dilaporkan audit (biasanya `largest-contentful-paint`, `render-blocking-insight`, atau `unused-css-rules`).

Bila `lighthouse` tidak bisa dijalankan di lingkungan ini, ganti dengan pengukuran langsung dan **tulis di catatan gerbang bahwa Lighthouse tidak tersedia**:

```js
new PerformanceObserver((l) => console.log(JSON.stringify(l.getEntries().map((e) => ({ lcp: e.startTime, el: e.element?.tagName, url: e.url }))))).observe({ type: "largest-contentful-paint", buffered: true });
```

- [ ] **Step 3: Console bersih**

Untuk keempat route, buka dengan console terbuka dan reload. Expected: **0 error, 0 warning**. Yang masih boleh: log Next.js produksi standar. Segala `Warning: Each child in a list should have a unique "key"`, `Invalid DOM nesting`, `Hydration failed`, atau `Image with src ... has invalid sizes` **harus diperbaiki sekarang**, bukan dicatat.

- [ ] **Step 4: `prefers-reduced-motion` masih berfungsi**

DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`, reload `/`:
- marquee berhenti (tidak ada animasi geser)
- `CountUp` tetap menampilkan angka akhir (1324 / 87 / 6912) — bukan 0
- tidak ada elemen yang berkedip (`neon-flicker`) atau melayang (`float-y`)
- scroll ke anchor `#archive` terjadi seketika, tidak smooth

`CountUp` memakai `requestAnimationFrame`, bukan CSS animation, jadi **tidak** otomatis mati lewat blok `@media`. Kalau angka tetap beranimasi saat reduced-motion aktif, tambahkan guard di `packages/ui/src/composites/count-up.tsx`:

```tsx
const reduce =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) { setValue(target); return; }
```

Taruh di dalam callback IntersectionObserver sebelum `requestAnimationFrame` pertama, dan uji ulang.

- [ ] **Step 5: Target sentuh (ulangi pengukuran Task 16 setelah semua perubahan)**

Jalankan snippet pengukuran 44px dari Task 16 Step 5 pada 390x844 untuk keempat route. Expected: kosong atau hanya sisa yang sudah dijelaskan.

- [ ] **Step 6: Matikan server + catat gerbang**

```bash
netstat -ano | grep :4317
taskkill //PID <pid> //F
```

Tambah setelah baris `**Fase 3** — ...` di §7, isi dengan angka nyata:

```markdown
> Fase 3 selesai <tanggal>: Lighthouse perf <angka> (`/`) dan <angka> (`/mission-control`),
> LCP image <angka> KB, total byte <angka>, 0 error/warning console di 4 route,
> semua target sentuh >= 44px pada 390px, reduced-motion mematikan marquee/flicker/float/smooth-scroll.
```

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-11-11-frontend-design-system-design.md
git commit -m "docs: catat gerbang fase 3 (a11y + performa gambar)"
```

Kalau Step 2-5 memaksa perbaikan kode, commit perbaikan itu **terpisah** sebelum commit dokumen ini, dengan pesan yang menyebut apa yang diperbaiki.

---

# FASE 4 — Shadow Command Center

Menggantikan isi `/mission-control` (§D4). URL tetap, metadata berubah jadi "Shadow Command Center". Referensi: `packages/assets/references/06-shadow-command-center.png`.

Urutan task sengaja: artwork → tipe+data → sidebar → komposit → section → wiring → gerbang. Tidak ada task yang boleh membuat halaman setengah jadi terlihat di route publik: `mission-control.tsx` lama tetap terpasang sampai Task 27 menggantinya dalam satu commit.

### Task 19: Artwork `shadow-command` + masuk pipeline optimasi

Owner sudah mengizinkan generate ulang artwork bila perlu (keputusan "Boleh generate ulang bila perlu"). Ini satu-satunya artwork baru yang dibutuhkan.

**Files:**
- Create: `apps/web/public/art/shadow-command.png`
- Create: `packages/assets/references/raw/shadow-command.png` (salinan sumber)
- Modify: `packages/assets/src/optimize.test.ts` (hapus `.skip` pada tes filesystem)
- Modify: `apps/web/public/art/shadow-command-{480,960,1440,1920}.{avif,webp}` (hasil skrip)

**Interfaces:**
- Consumes: `ArtKey` sudah memuat `"shadow-command"` (Task 1); `ART_SOURCES["shadow-command"]` sudah menunjuk `apps/web/public/art/shadow-command.png` (Task 3); `ARTWORK["shadow-command"]` sudah ada (Task 3).
- Produces: byte artwork yang membuat tes filesystem Task 3 hijau dan hero Shadow Command Center bisa dirender.

- [ ] **Step 1: Lihat referensinya dulu**

Buka `packages/assets/references/06-shadow-command-center.png` dan catat: palet (magenta `#ff2d78`, biru elektrik `#2ea8ff`, kuning asam `#ffd21f` di atas hitam), tekstur halftone komik, dan suasana (kota neon malam, bulan besar). Hero yang dihasilkan harus cocok dipakai **di belakang teks judul brush**, jadi komposisinya harus menyisakan area gelap di sisi kiri.

- [ ] **Step 2: Generate artwork**

Pakai `ImageGen` dengan prompt berikut (tanpa teks di dalam gambar — judul dirender HTML, bukan dibakar ke bitmap):

```
Use case: website hero artwork
Primary request: punk graffiti zine style hero illustration for a "shadow command center" dashboard
Scene/backdrop: night skyline of a neon city seen from a rooftop, giant electric-blue moon low on the horizon, scattered magenta and cyan neon signs, thin rain haze
Subject: two hooded figures seen from behind at the rooftop edge, one holding a spray can, silhouetted against the moon; a small table with glowing monitors to the side
Style/medium: hand-drawn punk zine collage, thick black ink outlines, screencraft halftone dot texture, distressed photocopy grain, flat magenta / electric blue / acid yellow accents on near-black
Composition/framing: wide 16:9 banner, subjects in the right third, the left third kept dark and low-detail so white display type stays readable, generous negative space at the top
Lighting/mood: moonlight rim-light on the figures, neon glow bleeding from below, high contrast, gritty and loud
Constraints: no text, no lettering, no logos, no watermark, no readable signage; do not add characters beyond the two figures
```

Ukuran: `1792x1024`.

- [ ] **Step 3: Simpan ke dua tempat**

```bash
cp <path-hasil-imagegen> apps/web/public/art/shadow-command.png
cp <path-hasil-imagegen> packages/assets/references/raw/shadow-command.png
ls -l apps/web/public/art/shadow-command.png
```

Expected: file ada, > 1 MB (sumber memang besar; yang disajikan browser adalah hasil Step 4).

- [ ] **Step 4: Aktifkan tes yang di-skip**

Di `packages/assets/src/optimize.test.ts`, ubah:

```ts
  it.skip("setiap kunci punya sumber PNG yang benar-benar ada di repo", async () => {
```

menjadi:

```ts
  it("setiap kunci punya sumber PNG yang benar-benar ada di repo", async () => {
```

- [ ] **Step 5: Jalankan tes (harus hijau) lalu pipeline optimasi**

```bash
pnpm --filter @moonwitness/assets test
pnpm --filter @moonwitness/assets optimize
ls apps/web/public/art/shadow-command-*.avif apps/web/public/art/shadow-command-*.webp
```

Expected: 4 tes hijau (tidak ada yang skip), `[ok] shadow-command` muncul di log optimasi (tidak lagi `[skip]`), dan 8 file baru ada.

Bandingkan byte:

```bash
ls -l apps/web/public/art/shadow-command.png apps/web/public/art/shadow-command-1440.avif
```

Expected: `-1440.avif` < 400 KB. Kalau lebih, turunkan `QUALITY` di `scripts/optimize.mjs` ke 55 dan jalankan ulang (perubahan itu memengaruhi semua artwork, jadi ulangi perbandingan Task 3 Step 8).

- [ ] **Step 6: Cek gambarnya benar, bukan sekadar ada**

Buka `apps/web/public/art/shadow-command.png` sebagai gambar dan periksa: dua figur bertudung, bulan biru besar, tidak ada teks/huruf, sisi kiri cukup gelap untuk teks putih. Kalau ada teks yang ikut ter-generate, ulangi Step 2 dengan `Constraints` dipertegas (`absolutely no text or lettering anywhere`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/public/art packages/assets/references/raw/shadow-command.png packages/assets/src/optimize.test.ts
git commit -m "feat(assets): artwork shadow-command + aktifkan tes keberadaan sumber"
```

---

### Task 20: Tipe + data dashboard

**Files:**
- Modify: `packages/types/src/index.ts` (tambah tipe §3.1)
- Modify: `apps/web/src/lib/data.ts` (tambah 6 koleksi data baru)

**Interfaces:**
- Consumes: `ArtKey`, `EventKind` dari Task 1.
- Produces (dipakai Task 22-26):

```ts
// @moonwitness/types
export type ItemStatus = "DRAFT" | "READY" | "IN REVIEW" | "APPROVED" | "PUBLISHED";
export type PipelineStage = "DRAFT" | "IN REVIEW" | "APPROVED" | "PUBLISHED";
export type StatTone = "pink" | "blue" | "yellow" | "green";

export interface UniverseStat { label: string; value: string; trend?: string; tone: StatTone; }
export interface QuickAction { id: string; label: string; icon: "plus" | "image" | "pen" | "stack"; moduleId: string; }
export interface WorkspaceItem { id: string; title: string; kind: EventKind; updatedAt: string; status: ItemStatus; }
export interface PipelineCard { id: string; title: string; type: EventKind; thumb: ArtKey; }
export interface PipelineColumn { stage: PipelineStage; count: number; more: number; items: PipelineCard[]; }
export interface Collection { id: string; name: string; episodes: number; cover: ArtKey; }
export interface MapCity { id: string; city: string; x: number; y: number; signals: number; }

// @/lib/data
export const universeStats: UniverseStat[];
export const quickActions: QuickAction[];
export const workspaceItems: WorkspaceItem[];
export const pipeline: PipelineColumn[];
export const collections: Collection[];
export const mapCities: MapCity[];
```

- [ ] **Step 1: Tambah tipe ke `packages/types/src/index.ts`**

Tulis persis blok `// @moonwitness/types` di atas, di akhir file. `StatTone` dipisah dari `UniverseStat` supaya Task 22 bisa memakai nama itu di signature `StatBlock`.

- [ ] **Step 2: Tambah data ke `apps/web/src/lib/data.ts`**

Angka-angka ini berasal dari referensi `06-shadow-command-center.png` (§6.2, §6.6, §6.7) — jangan dikarang ulang:

```ts
export const universeStats: UniverseStat[] = [
  { label: "STORIES ACTIVE", value: "12", trend: "+3 this week", tone: "pink" },
  { label: "EPISODES PUBLISHED", value: "48", trend: "+6 this month", tone: "blue" },
  { label: "COLLECTIONS LIVE", value: "6", trend: "2 curated", tone: "yellow" },
  { label: "TOTAL VIEWS", value: "3.2M", trend: "+18% vs last cycle", tone: "green" },
];

export const quickActions: QuickAction[] = [
  { id: "qa-episode", label: "NEW EPISODE", icon: "plus", moduleId: "story-forge" },
  { id: "qa-poster", label: "CREATE POSTER", icon: "image", moduleId: "poster-lab" },
  { id: "qa-story", label: "WRITE STORY", icon: "pen", moduleId: "story-forge" },
  { id: "qa-collection", label: "ADD TO COLLECTION", icon: "stack", moduleId: "publishing-hub" },
];

export const workspaceItems: WorkspaceItem[] = [
  { id: "ws-1", title: "The Batteries — Ep. 04 rough cut", kind: "PROJECT", updatedAt: "12m ago", status: "IN REVIEW" },
  { id: "ws-2", title: "Pendeta Online — script pass 2", kind: "STORY", updatedAt: "48m ago", status: "DRAFT" },
  { id: "ws-3", title: "Neon Cities poster set", kind: "SIGNAL", updatedAt: "2h ago", status: "READY" },
  { id: "ws-4", title: "Allahi Promise — source notes", kind: "RESEARCH", updatedAt: "5h ago", status: "APPROVED" },
  { id: "ws-5", title: "Zill — world bible v1", kind: "WORLD", updatedAt: "yesterday", status: "PUBLISHED" },
  { id: "ws-6", title: "Crew portraits batch 3", kind: "PEOPLE", updatedAt: "yesterday", status: "DRAFT" },
];
```

`pipeline` — jumlah per kolom harus cocok dengan referensi (DRAFT 8 / IN REVIEW 4 / APPROVED 6 / PUBLISHED 48). `items` hanya kartu yang benar-benar digambar; sisanya diwakili `more`:

```ts
export const pipeline: PipelineColumn[] = [
  {
    stage: "DRAFT",
    count: 8,
    more: 5,
    items: [
      { id: "pl-1", title: "Batteries Ep.05 outline", type: "PROJECT", thumb: "hero-witness" },
      { id: "pl-2", title: "Signal: MENA climate", type: "SIGNAL", thumb: "signal-tunnel" },
      { id: "pl-3", title: "Pendeta Online draft", type: "STORY", thumb: "crew-rooftop" },
    ],
  },
  {
    stage: "IN REVIEW",
    count: 4,
    more: 1,
    items: [
      { id: "pl-4", title: "Neon Cities ep.12", type: "WORLD", thumb: "city-shadow" },
      { id: "pl-5", title: "Poster set v3", type: "SIGNAL", thumb: "hero-witness" },
      { id: "pl-6", title: "Allahi Promise notes", type: "RESEARCH", thumb: "signal-tunnel" },
    ],
  },
  {
    stage: "APPROVED",
    count: 6,
    more: 2,
    items: [
      { id: "pl-7", title: "Zill world bible", type: "WORLD", thumb: "crew-rooftop" },
      { id: "pl-8", title: "Crew portraits b3", type: "PEOPLE", thumb: "city-shadow" },
      { id: "pl-9", title: "Fracture ep.03", type: "PROJECT", thumb: "hero-witness" },
      { id: "pl-10", title: "Expansions teaser", type: "STORY", thumb: "signal-tunnel" },
    ],
  },
  {
    stage: "PUBLISHED",
    count: 48,
    more: 44,
    items: [
      { id: "pl-11", title: "Origins ep.01", type: "PROJECT", thumb: "hero-witness" },
      { id: "pl-12", title: "Neon Cities ep.01", type: "WORLD", thumb: "city-shadow" },
      { id: "pl-13", title: "Rebuilding ep.01", type: "PEOPLE", thumb: "crew-rooftop" },
      { id: "pl-14", title: "Signal log 001", type: "SIGNAL", thumb: "signal-tunnel" },
    ],
  },
];

export const collections: Collection[] = [
  { id: "col-1", name: "NEON CITIES", episodes: 12, cover: "city-shadow" },
  { id: "col-2", name: "THE FRACTURE", episodes: 8, cover: "signal-tunnel" },
  { id: "col-3", name: "CREW PORTRAITS", episodes: 18, cover: "crew-rooftop" },
  { id: "col-4", name: "EXPANSIONS", episodes: 10, cover: "hero-witness" },
];

export const mapCities: MapCity[] = [
  { id: "london", city: "LONDON", x: 46, y: 30, signals: 412 },
  { id: "istanbul", city: "ISTANBUL", x: 55, y: 38, signals: 388 },
  { id: "seoul", city: "SEOUL", x: 80, y: 36, signals: 297 },
  { id: "cairo", city: "CAIRO", x: 54, y: 48, signals: 254 },
  { id: "tokyo", city: "TOKYO", x: 84, y: 40, signals: 501 },
  { id: "lagos", city: "LAGOS", x: 47, y: 57, signals: 366 },
  { id: "sao-paulo", city: "SÃO PAULO", x: 30, y: 70, signals: 198 },
  { id: "nairobi", city: "NAIROBI", x: 57, y: 60, signals: 233 },
];
```

Tambah `import type` yang dibutuhkan di kepala `lib/data.ts` dan perluas re-export sementara dari Task 1:

```ts
import type {
  Collection,
  MapCity,
  PipelineColumn,
  QuickAction,
  UniverseStat,
  WorkspaceItem,
  // ...impor lama
} from "@moonwitness/types";
```

- [ ] **Step 3: Pipeline**

```bash
pnpm turbo run lint typecheck build
```

Expected: hijau. Data baru belum punya pemakai, jadi tidak ada perubahan visual — **jangan** menjalankan screenshot di task ini.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts apps/web/src/lib/data.ts
git commit -m "feat(data): tipe + data dashboard Shadow Command Center"
```

### Task 21: Sidebar 10 item, satu item satu tujuan

§D5: 10 item sidebar bukan 10 route. Delapan item pertama adalah state di dalam halaman Shadow Command Center (scroll ke anchor atau buka drawer modul), hanya dua yang keluar route.

**Files:**
- Modify: `apps/web/src/components/shell/nav-items.ts` (9 item → 10 item, model target baru)
- Modify: `apps/web/src/components/shell/sidebar.tsx` (render target + penanda aktif berbasis scroll)
- Modify: `apps/web/src/components/shell/index.tsx` (baca pathname, turunkan item aktif, teruskan ke sidebar)
- Modify: `apps/web/src/components/dock/index.tsx` (hapus `active="dock"`; asalnya `dock.tsx:276`, pindah ke folder di Task 12)
- Modify: `apps/web/src/components/mission-control.tsx:234` (hapus `active="mission-control"`; file ini baru dihapus di Task 27)

**Interfaces:**
- Consumes: `usePathname` dari `next/navigation`, `Link` dari `next/link`, `Module`/`modules` dari `@/lib/data` (drawer dibuka lewat query `?module=`), pola `IntersectionObserver` dari `site-nav/index.tsx` (hasil Task 13b; asalnya `site-nav.tsx:23-37`).
- Produces:

```ts
export type NavTarget =
  | { kind: "route"; href: string }
  /** Scroll ke anchor. href = halaman pemilik anchor; Next menangani hash lintas halaman. */
  | { kind: "section"; href: string; anchor: string }
  /** Buka drawer modul. href = halaman pemilik drawer + query ?module=<id>. */
  | { kind: "module"; href: string; moduleId: string };

export interface NavItem {
  id: string;
  label: string;
  icon: string;      // path stroke SVG
  target: NavTarget;
}

export function navHref(item: NavItem): string;   // helper: target -> string href
export function activeByPath(pathname: string): string;  // route -> id nav item aktif
export const navItems: NavItem[];                 // 10 item
```

Signature `EmpireShell` berubah: prop `active: string` **dihapus** dan diturunkan dari `usePathname()`.

```ts
export function EmpireShell(props: {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  children: ReactNode;
}): JSX.Element
```

Alasannya: setelah id nav item diganti (Task 21 Step 1), string `"dock"` dan `"mission-control"` yang dikirim kedua halaman tidak lagi cocok dengan item mana pun, dan tidak ada type-check yang bisa menangkap salah ketik di sana. Menurunkan dari pathname membuat satu-satunya cara salah adalah menambah route tanpa menambah entri peta — dan itu terlihat langsung di browser sebagai "tidak ada item aktif", bukan sebagai item yang salah menyala.

`navHref` dibutuhkan karena `Link` hanya menerima string:

```ts
export function navHref(item: NavItem): string {
  switch (item.target.kind) {
    case "route":
      return item.target.href;
    case "section":
      return `${item.target.href}#${item.target.anchor}`;
    case "module":
      return `${item.target.href}?module=${item.target.moduleId}`;
  }
}
```

- [ ] **Step 1: Tulis 10 item**

Salin path ikon dari `navItems` lama bila sudah ada; untuk item baru, pakai path stroke sederhana bergaya sama (24x24 viewBox, `stroke-width` 1.8 di `sidebar.tsx`).

```ts
export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "M4 11 L12 4 L20 11 M6 10 L6 20 L18 20 L18 10",
    target: { kind: "section", href: "/mission-control", anchor: "cc-top" } },
  { id: "story-studio", label: "Story Studio", icon: "M4 20 L6 14 L16 4 L20 8 L10 18 Z M14 6 L18 10",
    target: { kind: "module", href: "/mission-control", moduleId: "story-forge" } },
  { id: "episodes", label: "Episodes", icon: "M4 5 L20 5 L20 19 L4 19 Z M8 9 L16 9 M8 13 L13 13",
    target: { kind: "section", href: "/mission-control", anchor: "cc-workspace" } },
  { id: "poster-forge", label: "Poster Forge", icon: "M4 5 L20 5 L20 19 L4 19 Z M4 15 L9 10 L14 15 L17 12 L20 15 M9 8.5 A0.5 0.5 0 1 0 9 8.5",
    target: { kind: "module", href: "/mission-control", moduleId: "poster-lab" } },
  { id: "collections", label: "Collections", icon: "M4 7 L12 3 L20 7 L12 11 Z M4 12 L12 16 L20 12 M4 17 L12 21 L20 17",
    target: { kind: "section", href: "/mission-control", anchor: "cc-collections" } },
  { id: "research", label: "Research", icon: "M10 3 L14 3 M11 3 L11 9 L5 19 Q4 21 7 21 L17 21 Q20 21 19 19 L13 9 L13 3 M8 15 L16 15",
    target: { kind: "section", href: "/mission-control", anchor: "cc-studios" } },
  { id: "crew", label: "Crew", icon: "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 M2 20 Q2 15 9 15 Q16 15 16 20 M17 11 A3 3 0 1 0 17 5 M18 20 Q18 16 22 16",
    target: { kind: "section", href: "/mission-control", anchor: "cc-crew" } },
  { id: "mission-log", label: "Mission Log", icon: "M5 4 L19 4 L19 20 L5 20 Z M8 8 L16 8 M8 12 L16 12 M8 16 L13 16",
    target: { kind: "section", href: "/mission-control", anchor: "cc-log" } },
  { id: "archive", label: "Archive", icon: "M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z M4 8 L12 12 L20 8 M12 12 L12 20",
    target: { kind: "route", href: "/dock" } },
  { id: "settings", label: "Settings", icon: "M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19",
    target: { kind: "route", href: "/shadow" } },
];
```

Label persis dari tabel §6. `moduleId` harus ada di `modules` (`lib/data.ts`) — cek dengan `grep -n "id: \"story-forge\"\|id: \"poster-lab\"" apps/web/src/lib/data.ts`; kalau id-nya beda, pakai yang ada di data, jangan mengarang.

Item lama yang hilang (`mission-control`, `dock` sebagai "Project Universe", `research-lab`, `world-monitor`, `publishing-hub`) **sengaja digantikan**: modulnya tetap bisa dibuka lewat Quick Actions (bagian 3), tile Studio (bagian 8), dan drawer — §6 menjamin tidak ada kemampuan yang hilang.

- [ ] **Step 2: `sidebar.tsx` memakai `navHref` + penanda aktif**

```tsx
"use client";

import Link from "next/link";
import { navHref, type NavItem } from "./nav-items";

export interface SidebarProps {
  items: NavItem[];
  active: string;
  activeSection: string | null;
  onNavigate?: () => void;
}

export function Sidebar({ items, active, activeSection, onNavigate }: SidebarProps) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Empire">
      {items.map((item) => {
        const isActive = item.id === active || item.id === activeSection;
        return (
          <Link
            key={item.id}
            href={navHref(item)}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-[var(--pink)] font-bold text-white shadow-[3px_3px_0_rgba(0,0,0,0.5)]"
                : "text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Kelas di atas disalin dari `empire-shell.tsx:138-142` (versi sebelum dipecah), dengan dua perubahan yang memang diniatkan: kondisi aktif memakai `isActive` (bukan `active === item.id`) dan `min-h-11` dari Task 16. Jangan mengubah warna, shadow, atau spacing.

- [ ] **Step 3: `active` dari pathname, `activeSection` lewat IntersectionObserver**

Tambah peta route → id item di `nav-items.ts`:

```ts
const ACTIVE_BY_PATH: Record<string, string> = {
  "/dock": "archive",
  "/mission-control": "dashboard",
  "/shadow": "settings",
};

export function activeByPath(pathname: string): string {
  return ACTIVE_BY_PATH[pathname] ?? "";
}
```

Lalu di `shell/index.tsx`: hapus `active` dari props `EmpireShell`, hitung `const active = activeByPath(pathname);`, dan teruskan ke `<Sidebar items={navItems} active={active} activeSection={activeSection} … />`. Hapus baris `active="dock"` di `dock.tsx:276` dan `active="mission-control"` di `mission-control.tsx:234`.

`pathname` sudah dibaca di task ini untuk observer di bawah, jadi tidak ada hook baru.

Tambah juga di `shell/index.tsx`, menyalin pola `site-nav/index.tsx` (hasil Task 13b; asalnya `site-nav.tsx:23-37`, rootMargin sama):

```tsx
const pathname = usePathname();
const [activeSection, setActiveSection] = useState<string | null>(null);

const sectionItems = navItems.filter(
  (i): i is NavItem & { target: { kind: "section"; href: string; anchor: string } } =>
    i.target.kind === "section" && i.target.href === pathname,
);

useEffect(() => {
  if (sectionItems.length === 0) {
    setActiveSection(null);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const hit = sectionItems.find((i) => i.target.anchor === entry.target.id);
        if (hit) setActiveSection(hit.id);
      }
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  for (const item of sectionItems) {
    const el = document.getElementById(item.target.anchor);
    if (el) observer.observe(el);
  }
  return () => observer.disconnect();
}, [pathname, sectionItems.length]);
```

`sectionItems` dihitung ulang tiap render, jadi **jangan** menaruhnya di dependency array apa adanya (object identity berubah terus) — pakai `sectionItems.length` seperti di atas, atau bungkus dengan `useMemo` berbasis `pathname`. Kalau lint `react-hooks/exhaustive-deps` mengeluh, pilih `useMemo`:

```tsx
const sectionAnchors = useMemo(
  () =>
    navItems
      .filter((i) => i.target.kind === "section" && i.target.href === pathname)
      .map((i) => ({ id: i.id, anchor: (i.target as { anchor: string }).anchor })),
  [pathname],
);
```

lalu observer memakai `sectionAnchors` dan dependency `[sectionAnchors]`.

Anchor `cc-top`, `cc-workspace`, `cc-collections`, `cc-studios`, `cc-crew`, `cc-log` belum ada sampai Task 25 — observer hanya tidak menemukan elemennya, dan itu tidak melempar error. Sidebar di `/dock` tetap berfungsi karena `sectionItems` kosong di sana.

- [ ] **Step 4: Pipeline + bukti perilaku di `/dock`**

```bash
pnpm turbo run lint typecheck build
```

Start produksi, buka `/dock` (satu-satunya halaman yang shell-nya sudah jadi):
1. Sidebar menampilkan 10 item dengan label baru.
2. Klik `Archive` → tetap di `/dock` (item aktif).
3. Klik `Dashboard` → pindah ke `/mission-control` (halaman lama masih terpasang sampai Task 27 — anchor belum ada, jadi browser hanya pindah route tanpa scroll; itu diharapkan).
4. Klik `Settings` → `/shadow`.
5. 390px: buka drawer sidebar, klik item → drawer tertutup.

Ambil SHOT `.verify/phase4-task21/dock-*.png` dan bandingkan `.verify/phase2/dock-*.png`: **perbedaan yang diniatkan** adalah daftar item sidebar (9 → 10, label berubah). Lebar sidebar, warna, dan item aktif harus tetap sama.

Matikan server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shell apps/web/src/components/dock/index.tsx apps/web/src/components/mission-control.tsx
git commit -m "feat(shell): sidebar 10 item dengan target section/drawer/route"
```

---

### Task 22: Komposit status (`StatBlock`, `StatusBadge`, `QuickActionGrid`, `WorkspaceList`)

**Files:**
- Create: `packages/ui/src/composites/stat-block.tsx`
- Create: `packages/ui/src/composites/status-badge.tsx`
- Create: `packages/ui/src/composites/quick-action-grid.tsx`
- Create: `packages/ui/src/composites/workspace-list.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/composites/module-glyphs.ts` (tambah glyph `plus` dan `stack`)

**Interfaces:**
- Consumes: `UniverseStat`, `StatTone`, `ItemStatus`, `QuickAction`, `WorkspaceItem` dari `@moonwitness/types` (Task 20); `ZineCard`, `ZineCardRough`, `ZineBadge` (Task 6); `MODULE_GLYPHS`/`ModuleGlyph` (Task 9).
- Produces:

```ts
function StatBlock(props: { stat: UniverseStat }): JSX.Element
function StatusBadge(props: { status: ItemStatus }): JSX.Element
function QuickActionGrid(props: { actions: QuickAction[]; onAction: (action: QuickAction) => void }): JSX.Element
function WorkspaceList(props: { items: WorkspaceItem[]; onOpenItem: (id: string) => void }): JSX.Element
```

- [ ] **Step 1: Tambah dua glyph**

`QuickAction.icon` punya union `"plus" | "image" | "pen" | "stack"`; `image` dan `pen` sudah ada di `MODULE_GLYPHS`, dua lainnya belum:

```ts
  plus: "M12 5 L12 19 M5 12 L19 12",
  stack: "M4 7 L12 3 L20 7 L12 11 Z M4 12 L12 16 L20 12 M4 17 L12 21 L20 17",
```

Tambahkan ke objek `MODULE_GLYPHS` di `packages/ui/src/composites/module-glyphs.ts`.

- [ ] **Step 2: `status-badge.tsx`**

Warna per status mengikuti palet token (§3.2), bukan warna baru:

```tsx
import type { ItemStatus } from "@moonwitness/types";
import { ZineBadge } from "../primitives/zine-badge";

const STATUS_COLOR: Record<ItemStatus, string> = {
  DRAFT: "#a855f7",
  READY: "#2ea8ff",
  "IN REVIEW": "#ffd21f",
  APPROVED: "#3ddc84",
  PUBLISHED: "#ff2d78",
};

const STATUS_DARK: Record<ItemStatus, boolean> = {
  DRAFT: false,
  READY: false,
  "IN REVIEW": true,
  APPROVED: true,
  PUBLISHED: false,
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <ZineBadge color={STATUS_COLOR[status]} dark={STATUS_DARK[status]}>
      {status}
    </ZineBadge>
  );
}
```

`dark: true` untuk latar terang (kuning, hijau) supaya teks tetap terbaca — rasio kontras minimal sama dengan pola `KindBadge` yang sudah ada.

- [ ] **Step 3: `stat-block.tsx`**

```tsx
import type { StatTone, UniverseStat } from "@moonwitness/types";
import { cn } from "../cn";
import { ZineCard } from "../primitives/zine-card";

const TONE_VAR: Record<StatTone, string> = {
  pink: "var(--pink)",
  blue: "var(--blue)",
  yellow: "var(--yellow)",
  green: "var(--green)",
};

export function StatBlock({ stat }: { stat: UniverseStat }) {
  return (
    <ZineCard className="relative overflow-hidden p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: TONE_VAR[stat.tone] }} />
      <div className="font-brush text-3xl leading-none sm:text-4xl" style={{ color: TONE_VAR[stat.tone] }}>
        {stat.value}
      </div>
      <div className={cn("mt-2 text-[10px] tracking-widest text-zinc-500")}>{stat.label}</div>
      {stat.trend && <div className="mt-1 text-[11px] text-zinc-400">{stat.trend}</div>}
    </ZineCard>
  );
}
```

- [ ] **Step 4: `quick-action-grid.tsx`**

Setiap tombol **harus** punya tujuan nyata (§6.3: "tidak ada tombol mati") — tujuannya adalah `onAction`, yang di app membuka drawer modul sesuai `action.moduleId`:

```tsx
"use client";

import type { QuickAction } from "@moonwitness/types";
import { ModuleGlyph } from "./module-glyph";

export interface QuickActionGridProps {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export function QuickActionGrid({ actions, onAction }: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onAction(action)}
          className="btn-zine min-h-11 flex-col gap-2 px-4 py-3 text-sm"
        >
          <ModuleGlyph icon={action.icon} className="h-5 w-5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

`grid-cols-2` eksplisit di mobile — pelajaran dari sesi sebelumnya: track grid implisit berukuran `auto` dan menyebabkan overflow horizontal di 390px.

- [ ] **Step 5: `workspace-list.tsx`**

```tsx
"use client";

import type { WorkspaceItem } from "@moonwitness/types";
import { ZineCard } from "../primitives/zine-card";
import { StatusBadge } from "./status-badge";
import { kindColors } from "./kind-colors";

export interface WorkspaceListProps {
  items: WorkspaceItem[];
  onOpenItem: (id: string) => void;
}

export function WorkspaceList({ items, onOpenItem }: WorkspaceListProps) {
  return (
    <ZineCard className="divide-y-2 divide-[var(--line)] overflow-hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpenItem(item.id)}
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--panel-2)] focus-visible:bg-[var(--panel-2)]"
        >
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: kindColors[item.kind] }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-zinc-200">{item.title}</span>
            <span className="mt-0.5 block text-[10px] tracking-widest text-zinc-500">
              {item.kind} · {item.updatedAt}
            </span>
          </span>
          <StatusBadge status={item.status} />
        </button>
      ))}
    </ZineCard>
  );
}
```

`min-w-0` pada span fleksibel wajib: tanpa itu judul panjang mendorong badge keluar dan membuat overflow di 390px.

- [ ] **Step 6: Export + pipeline**

Tambah ke `packages/ui/src/index.ts`:

```ts
export { StatBlock } from "./composites/stat-block";
export { StatusBadge } from "./composites/status-badge";
export { QuickActionGrid, type QuickActionGridProps } from "./composites/quick-action-grid";
export { WorkspaceList, type WorkspaceListProps } from "./composites/workspace-list";
```

```bash
pnpm turbo run lint typecheck build
grep -rn "next/" packages/ui/src
```

Expected: hijau; grep 0 baris. Belum ada pemakai, jadi tidak ada bukti visual — itu muncul di Task 25.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src
git commit -m "feat(ui): komposit status dashboard (StatBlock, StatusBadge, QuickActionGrid, WorkspaceList)"
```

### Task 23: Komposit pipeline + koleksi (`KanbanColumn`, `CollectionsGrid`)

§D6: **tanpa drag-and-drop**. Kartu bisa diklik untuk membuka drawer detail; memindahkan antar kolom adalah operasi backend dan bukan bagian v1.

**Files:**
- Create: `packages/ui/src/composites/kanban-column.tsx`
- Create: `packages/ui/src/composites/collections-grid.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `PipelineColumn`, `PipelineStage`, `PipelineCard`, `Collection`, `EventKind` dari `@moonwitness/types`; `ZineCard`, `ZineImage` (Task 6); `kindColors` (Task 7).
- Produces:

```ts
function KanbanColumn(props: {
  column: PipelineColumn;
  onOpenItem: (card: PipelineCard) => void;
}): JSX.Element
function CollectionsGrid(props: {
  collections: Collection[];
  onOpenCollection: (id: string) => void;
}): JSX.Element
const STAGE_COLOR: Record<PipelineStage, string>;   // diekspor untuk dipakai orkestrator bila perlu
```

- [ ] **Step 1: `kanban-column.tsx`**

```tsx
"use client";

import type { PipelineCard, PipelineColumn, PipelineStage } from "@moonwitness/types";
import { ZineImage } from "../primitives/zine-image";
import { kindColors } from "./kind-colors";

/** Border berwarna per stage, sama seperti referensi 06-shadow-command-center.png. */
export const STAGE_COLOR: Record<PipelineStage, string> = {
  DRAFT: "#a855f7",
  "IN REVIEW": "#ffd21f",
  APPROVED: "#3ddc84",
  PUBLISHED: "#ff2d78",
};

export interface KanbanColumnProps {
  column: PipelineColumn;
  onOpenItem: (card: PipelineCard) => void;
}

export function KanbanColumn({ column, onOpenItem }: KanbanColumnProps) {
  const color = STAGE_COLOR[column.stage];
  return (
    <section
      aria-label={`${column.stage}, ${column.count} item`}
      className="flex min-w-0 flex-col gap-3 border-t-4 bg-[var(--panel)] p-3"
      style={{ borderTopColor: color }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-brush text-base leading-none" style={{ color }}>
          {column.stage}
        </h3>
        <span className="text-[11px] text-zinc-500">{column.count}</span>
      </header>
      <div className="flex flex-col gap-2">
        {column.items.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpenItem(card)}
            className="zine-card flex min-h-11 w-full items-center gap-3 p-2 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm">
              <ZineImage art={card.thumb} alt="" sizes="64px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-zinc-200">{card.title}</span>
              <span className="mt-1 block text-[10px] tracking-widest" style={{ color: kindColors[card.type] }}>
                {card.type}
              </span>
            </span>
          </button>
        ))}
      </div>
      {column.more > 0 && (
        <p className="text-center text-[10px] tracking-widest text-zinc-600">
          +{column.more} MORE
        </p>
      )}
    </section>
  );
}
```

`min-w-0` pada `<section>` wajib — kolom ini masuk grid 4 kolom di desktop, dan tanpa itu judul panjang melebarkan track (penyebab overflow yang sudah pernah kejadian di sesi sebelumnya).

- [ ] **Step 2: `collections-grid.tsx`**

```tsx
"use client";

import type { Collection } from "@moonwitness/types";
import { ZineCard } from "../primitives/zine-card";
import { ZineImage } from "../primitives/zine-image";

export interface CollectionsGridProps {
  collections: Collection[];
  onOpenCollection: (id: string) => void;
}

export function CollectionsGrid({ collections, onOpenCollection }: CollectionsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {collections.map((collection) => (
        <button
          key={collection.id}
          type="button"
          onClick={() => onOpenCollection(collection.id)}
          className="text-left"
        >
          <ZineCard className="group overflow-hidden transition-transform hover:-translate-y-1">
            <span className="relative block h-28 overflow-hidden">
              <ZineImage
                art={collection.cover}
                alt=""
                sizes="(max-width: 1279px) 50vw, 25vw"
                className="grayscale transition-all duration-500 group-hover:grayscale-0"
              />
            </span>
            <span className="block p-3">
              <span className="block font-brush text-sm leading-tight text-white group-hover:text-[var(--pink)]">
                {collection.name}
              </span>
              <span className="mt-1 block text-[10px] tracking-widest text-zinc-500">
                {collection.episodes} EPISODES
              </span>
            </span>
          </ZineCard>
        </button>
      ))}
    </div>
  );
}
```

`grid-cols-2` eksplisit di mobile (2 tile per baris pada 390px masih muat karena tinggi gambar tetap); kalau perbandingan screenshot menunjukkan tile terlalu sempit untuk teks, turunkan jadi `grid-cols-1 max-sm:grid-cols-1 sm:grid-cols-2` dan catat alasannya di commit.

- [ ] **Step 3: Export + pipeline**

Tambah ke `packages/ui/src/index.ts`:

```ts
export { KanbanColumn, STAGE_COLOR, type KanbanColumnProps } from "./composites/kanban-column";
export { CollectionsGrid, type CollectionsGridProps } from "./composites/collections-grid";
```

```bash
pnpm turbo run lint typecheck build
grep -rn "next/\|drag\|onDragStart\|draggable" packages/ui/src
```

Expected: hijau; grep 0 baris (baris kedua membuktikan §D6 — tidak ada API drag sama sekali di paket).

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src
git commit -m "feat(ui): KanbanColumn (tanpa drag-and-drop) + CollectionsGrid"
```

---

### Task 24: Komposit `WorldMap`

§6.9: node kota + garis koneksi, `onSelect` membuka detail kota di panel samping.

**Files:**
- Create: `packages/ui/src/composites/world-map.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `MapCity` dari `@moonwitness/types`; `ZineCardRough`, `Halftone` (Task 6).
- Produces:

```ts
function WorldMap(props: {
  cities: MapCity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): JSX.Element
```

Komponen ini **terkendali** (selected dari luar) karena panel detail kota dirender app di samping peta — §3.2: "Komponen yang perlu tahu pilihan ke dunia luar menerima callback".

- [ ] **Step 1: Tulis `world-map.tsx`**

```tsx
"use client";

import type { MapCity } from "@moonwitness/types";
import { Halftone } from "../primitives/texture";
import { ZineCardRough } from "../primitives/zine-card";

export interface WorldMapProps {
  cities: MapCity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Peta sinyal stylized: bukan proyeksi geografis, hanya posisi relatif dari data. */
export function WorldMap({ cities, selectedId, onSelect }: WorldMapProps) {
  return (
    <ZineCardRough className="relative overflow-hidden p-4">
      <Halftone className="absolute inset-0 opacity-30" />
      <svg viewBox="0 0 100 80" className="relative h-64 w-full sm:h-80" role="group" aria-label="Universe map">
        {cities.map((a, i) =>
          cities.slice(i + 1).map((b) => (
            <line
              key={`${a.id}-${b.id}`}
              x1={a.x}
              y1={a.y * 0.8}
              x2={b.x}
              y2={b.y * 0.8}
              stroke={i % 2 ? "#ff2d78" : "#2ea8ff"}
              strokeWidth="0.18"
              strokeDasharray="1.2 1.6"
              opacity="0.4"
            />
          )),
        )}
        {cities.map((c) => (
          <circle
            key={c.id}
            cx={c.x}
            cy={c.y * 0.8}
            r={selectedId === c.id ? 2.2 : 1.3}
            fill={selectedId === c.id ? "#ffd21f" : "#ff2d78"}
            className="pulse-dot"
            style={{ animationDelay: `${c.x * 20}ms` }}
          />
        ))}
      </svg>
      <ul className="relative mt-3 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-pressed={selectedId === c.id}
              className={`zine-card min-h-11 px-3 py-2 text-[11px] tracking-widest transition-colors ${
                selectedId === c.id
                  ? "border-[var(--yellow)] bg-[var(--yellow)] text-black"
                  : "text-zinc-300 hover:border-[var(--pink)] hover:text-[var(--pink)]"
              }`}
            >
              {c.city}
              <span className="ml-2 text-[10px] text-zinc-500">{c.signals}</span>
            </button>
          </li>
        ))}
      </ul>
    </ZineCardRough>
  );
}
```

Node SVG **sengaja tidak** dibuat fokusabel: 8 lingkaran 2.6px tidak bisa diklik dengan akurat dan tidak lolos target sentuh 44px. Daftar tombol di bawahnya adalah jalur keyboard + sentuh yang setara, dan `aria-pressed` mengumumkan pilihan. Pola ini sama dengan `CrewConstellation` yang sudah ada (dot-nya 32px + hit area Task 16).

Kalau ingin dot-nya tetap bisa diklik mouse, tambahkan `onClick` pada `<circle>` dengan `style={{ cursor: "pointer" }}` **tanpa** `tabIndex` — jalur keyboard tetap lewat daftar tombol, jadi tidak ada target sentuh yang gagal.

- [ ] **Step 2: Export + pipeline**

Tambah ke `packages/ui/src/index.ts`:

```ts
export { WorldMap, type WorldMapProps } from "./composites/world-map";
```

```bash
pnpm turbo run lint typecheck build
```

Expected: hijau.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src
git commit -m "feat(ui): WorldMap dengan node kota dan daftar tombol setara"
```

### Task 25: Shadow Command Center bagian 1-5 + drawer modul

Route **belum** dipindah di task ini — Task 27 yang memindah. Jadi semua file di sini belum terlihat publik dan `mission-control.tsx` lama tetap terpasang utuh sampai Task 26 selesai. Tidak ada commit di fase 4 yang membuat halaman publik setengah jadi.

**Files:**
- Create: `apps/web/src/components/command-center/section-heading.tsx`
- Create: `apps/web/src/components/command-center/hero.tsx`
- Create: `apps/web/src/components/command-center/status.tsx`
- Create: `apps/web/src/components/command-center/quick-actions.tsx`
- Create: `apps/web/src/components/command-center/ideas.tsx`
- Create: `apps/web/src/components/command-center/workspace.tsx`
- Create: `apps/web/src/components/command-center/module-drawer.tsx`
- Create: `apps/web/src/components/command-center/index.tsx`

**Interfaces:**
- Consumes: `artSrc` dari `@/lib/art` (Task 1); `UniverseStat`, `QuickAction`, `WorkspaceItem`, `Project`, `Module` dari `@moonwitness/types` (Task 1, 20); `StatBlock`, `QuickActionGrid`, `WorkspaceList`, `Halftone`, `ZineBadge` dari `@moonwitness/ui` (Task 6, 22); `ModuleGlyph` dari `@moonwitness/ui` (Task 9); `Crown`, `Splatter`, `Star4`, `ArrowRight` dari `@moonwitness/ui/icons` (Task 5); `EmpireShell` tanpa prop `active` (Task 13 + Task 21); `universeStats`, `quickActions`, `workspaceItems`, `projects`, `modules`, `initialWorkflows` dari `@/lib/data`.
- Produces (dipakai Task 26, yang menulis ulang `index.tsx`):

```ts
function SectionHeading(props: { id?: string; title: string; accent?: string; note?: string }): JSX.Element
function CommandHero(): JSX.Element
function UniverseStatus(props: { stats: UniverseStat[] }): JSX.Element
function QuickActions(props: { actions: QuickAction[]; onAction: (a: QuickAction) => void }): JSX.Element
function IdeasInMotion(): JSX.Element
function Workspace(props: { items: WorkspaceItem[]; onOpenItem: (id: string) => void }): JSX.Element
function ModuleDrawer(props: {
  module: Module;
  projects: Project[];
  onQueue: (m: Module) => void;
  onClose: () => void;
}): JSX.Element
export function CommandCenter(): JSX.Element
```

Anchor yang disumbang bagian 1-5: `cc-top` (hero, §6 sidebar "Dashboard") dan `cc-workspace` (bagian 5, sidebar "Episodes"). Empat anchor lain (`cc-collections`, `cc-studios`, `cc-crew`, `cc-log`) datang di Task 26.

- [ ] **Step 1: `section-heading.tsx`**

Satu pola judul untuk 11 bagian; tanpa ini tiap section file menulis ulang heading dan `index.tsx` tidak muat di bawah 150 baris.

```tsx
import { Star4 } from "@moonwitness/ui/icons";

export interface SectionHeadingProps {
  id?: string;
  title: string;
  accent?: string;
  note?: string;
}

export function SectionHeading({ id, title, accent, note }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 id={id} className="font-brush text-2xl text-white sm:text-3xl">
        {title}
        {accent && <span className="text-[var(--pink)]"> {accent}</span>}
      </h2>
      {note && (
        <span className="flex items-center gap-2 text-[10px] tracking-wider text-zinc-500">
          <Star4 className="h-3.5 w-3.5 text-[var(--yellow)]" />
          {note.toUpperCase()}
        </span>
      )}
    </div>
  );
}
```

`id` ditaruh di `<h2>`, bukan di `<section>`, supaya `href="#cc-workspace"` mendarat di judulnya — scroll-into-view bawaan browser memakai elemen ber-id, dan menaruhnya di section membuat judul terpotong di bawah topbar sticky.

- [ ] **Step 2: `hero.tsx` (§6.1)**

Hero adalah LCP halaman ini, jadi pakai `next/image` dengan sumber PNG (R6), bukan `ZineImage`:

```tsx
import Image from "next/image";
import { Crown, Splatter } from "@moonwitness/ui/icons";
import { artSrc } from "@/lib/art";

const STRIP = ["PRIVATE", "CREATE · CURATE · DEPLOY"];

export function CommandHero() {
  return (
    <div className="grain relative overflow-hidden border-b-2 border-[var(--line)]">
      <Image
        src={artSrc("shadow-command")}
        alt=""
        fill
        priority
        className="object-cover object-[65%_35%]"
        sizes="(max-width: 1024px) 100vw, 80vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.92)] via-[rgba(11,11,16,0.55)] to-transparent" />
      <Splatter className="absolute -left-6 top-6 h-32 w-32 text-[var(--pink)] opacity-60" />
      <div className="relative z-10 px-4 py-10 sm:px-8">
        <div className="relative inline-block">
          <h1
            id="cc-top"
            className="scroll-mt-24 font-brush text-4xl leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] sm:text-6xl"
          >
            SHADOW <span className="text-[var(--pink)]">COMMAND</span> CENTER
          </h1>
          <Crown className="absolute -top-5 right-0 h-6 w-9 -rotate-12 text-[var(--yellow)]" />
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
          Coordinate stories, research, world signals, AI workflows, and publishing operations.
          Different people. Same sky. A brighter tomorrow for a bolder humanity.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-brush text-sm text-[var(--yellow)]">
          {STRIP.map((w, i) => (
            <span key={w} className="flex items-center gap-4">
              {i > 0 && <span className="text-zinc-500">//</span>}
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Tiga hal disalin dari `mission-control.tsx:242-274` supaya hero terasa satu keluarga dengan halaman lama: overlay gradient, `Splatter` di kiri atas, dan strip kata bercetak brush. Yang berbeda hanya teks (§6.1: "SHADOW COMMAND CENTER", strip `PRIVATE // CREATE · CURATE · DEPLOY`) dan artwork (`shadow-command` dari Task 19, bukan `city-shadow`). Tekstur butir datang dari kelas CSS `grain` pada wrapper — komponen `Grain` dari paket **tidak** dipakai di sini dan tidak boleh diimpor, karena wrapper ini bukan elemen yang bisa ditempeli span absolut tanpa menutupi overlay.

`scroll-mt-24` wajib: topbar shell sticky setinggi ~64px, jadi anchor `#cc-top` tanpa offset akan menutupi judul.

- [ ] **Step 3: `status.tsx` (§6.2)**

```tsx
import type { UniverseStat } from "@moonwitness/types";
import { StatBlock, ZineBadge } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export function UniverseStatus({ stats }: { stats: UniverseStat[] }) {
  return (
    <section aria-labelledby="cc-status-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-status-heading"
        title="UNIVERSE"
        accent="STATUS"
        note="live snapshot"
      />
      <div className="mb-3 flex justify-end">
        <ZineBadge color="#3ddc84" dark>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />
          LIVE
        </ZineBadge>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatBlock key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}
```

Empat angka (§6.2: 12 / 48 / 6 / 3.2M) datang dari `universeStats` (Task 20), bukan ditulis di sini. Badge LIVE adalah penanda statis, bukan koneksi waktu nyata — jangan menambah polling.

- [ ] **Step 4: `quick-actions.tsx` (§6.3)**

```tsx
import type { QuickAction } from "@moonwitness/types";
import { QuickActionGrid } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface QuickActionsProps {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export function QuickActions({ actions, onAction }: QuickActionsProps) {
  return (
    <section aria-labelledby="cc-quick-heading" className="scroll-mt-24">
      <SectionHeading id="cc-quick-heading" title="QUICK" accent="ACTIONS" />
      <QuickActionGrid actions={actions} onAction={onAction} />
    </section>
  );
}
```

`onAction` diisi orkestrator dengan fungsi yang membuka drawer modul sesuai `action.moduleId` — §6.3 menjamin tidak ada tombol mati.

- [ ] **Step 5: `ideas.tsx` (§6.4)**

Panel statis hitam-putih halftone. Tidak punya data dan tidak punya interaksi, jadi tidak menerima prop:

```tsx
import { Halftone } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export function IdeasInMotion() {
  return (
    <section aria-labelledby="cc-ideas-heading" className="scroll-mt-24">
      <SectionHeading id="cc-ideas-heading" title="IDEAS PEOPLE WORLDS" accent="IN MOTION" />
      <div className="relative overflow-hidden border-2 border-[var(--line)] bg-black">
        <Halftone tone="white" className="absolute inset-0 opacity-30" />
        <div className="relative z-10 px-5 py-10 text-center">
          <p className="font-brush text-2xl leading-tight text-white sm:text-4xl">
            DIFFERENT PEOPLE. SAME SKY.
            <br />
            <span className="text-[var(--yellow)]">STORIES BEYOND BORDERS.</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-zinc-400">
            Every episode starts as a scribbled idea on a rooftop. This board is where those
            scribbles wait to be picked up.
          </p>
        </div>
      </div>
    </section>
  );
}
```

Kalimat manifesto disalin dari sticker sidebar (`empire-shell.tsx`, "DIFFERENT PEOPLE. SAME SKY. STORIES BEYOND BORDERS.") supaya suara halaman tetap satu — jangan mengarang slogan baru.

- [ ] **Step 6: `workspace.tsx` (§6.5)**

```tsx
import type { WorkspaceItem } from "@moonwitness/types";
import { WorkspaceList } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface WorkspaceProps {
  items: WorkspaceItem[];
  onOpenItem: (id: string) => void;
}

export function Workspace({ items, onOpenItem }: WorkspaceProps) {
  return (
    <section aria-labelledby="cc-workspace" className="scroll-mt-24">
      <SectionHeading id="cc-workspace" title="RECENT WORKSPACE" accent="ITEMS" note={`${items.length} items`} />
      <WorkspaceList items={items} onOpenItem={onOpenItem} />
    </section>
  );
}
```

`id="cc-workspace"` adalah anchor sidebar item **Episodes** (Task 21) — namanya harus persis sama atau observer tidak menemukan elemennya dan item itu tidak pernah menyala.

- [ ] **Step 7: `module-drawer.tsx`**

Pindahkan `mission-control.tsx:465-537` ke sini dengan tiga perubahan wajib:

| lama | baru | alasan |
|---|---|---|
| baca `openModule` dari state | terima `module: Module` | komponen jadi murni, state tetap di orkestrator |
| `setOpenModule(null)` | `onClose()` | callback keluar (§3.2) |
| `queueRun(openModule)` | `onQueue(module)` | callback keluar |
| `projects.slice(0, 3)` | `projects.slice(0, 3)` dari prop `projects` | drawer tidak impor data sendiri |
| `ModuleIcon` | `ModuleGlyph` (Task 9) | ikon lama sudah pindah ke paket |
| tombol tutup `className="p-2 …"` | `className="min-h-11 min-w-11 p-2 …"` | Task 16: target sentuh ≥ 44px |

```tsx
import type { Module, Project } from "@moonwitness/types";
import { ModuleGlyph } from "@moonwitness/ui";
import { ArrowRight } from "@moonwitness/ui/icons";

export interface ModuleDrawerProps {
  module: Module;
  projects: Project[];
  onQueue: (m: Module) => void;
  onClose: () => void;
}

export function ModuleDrawer({ module, projects, onQueue, onClose }: ModuleDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${module.name} console`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="zine-card-rough absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-md"
            style={{
              background: module.color,
              color: module.color === "#ffd21f" ? "#111" : "#fff",
            }}
          >
            <ModuleGlyph icon={module.icon} className="h-7 w-7" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close module console"
            className="min-h-11 min-w-11 p-2 text-zinc-400 hover:text-[var(--pink)]"
          >
            ✕
          </button>
        </div>
        <h2 className="font-brush mt-4 text-3xl text-white">{module.name.toUpperCase()}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{module.description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {module.stats.map((s) => (
            <div
              key={s.label}
              className="border border-[var(--line)] bg-[var(--panel-2)] p-3 text-center"
            >
              <div className="font-brush text-2xl" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="mt-1 text-[10px] tracking-wider text-zinc-500">
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
        <h3 className="font-brush mt-6 text-sm text-[var(--yellow)]">CONNECTED PROJECTS</h3>
        <div className="mt-2 space-y-2">
          {projects.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border border-[var(--line)] px-3 py-2"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              <span className="flex-1 min-w-0 truncate text-xs text-zinc-200">{p.title}</span>
              <span className="text-[10px] text-zinc-500">{p.progress}%</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onQueue(module)}
          className="btn-zine mt-6 w-full px-6 py-3.5 text-lg"
        >
          QUEUE NEW RUN <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-[10px] text-zinc-600">
          Starts a workflow in the Automation Center immediately.
        </p>
      </div>
    </div>
  );
}
```

Selain enam perubahan di tabel, markup disalin persis. `min-w-0 truncate` pada judul proyek adalah satu-satunya tambahan lain: di 390px drawer selebar layar, dan judul panjang seperti "The Batteries" plus persentase bisa mendorong lebar panel.

Drawer tidak memasang `Escape`-to-close sendiri; itu tanggung jawab orkestrator (Task 26 Step 7) supaya satu handler melayani semua drawer di halaman.

- [ ] **Step 8: `index.tsx` (versi bagian 1-5)**

Task 26 menulis ulang file ini secara lengkap. Versi di bawah sudah harus typecheck dan lint bersih, tapi belum dirutekan.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Module, QuickAction, Workflow } from "@moonwitness/types";
import { Star4 } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import {
  initialWorkflows,
  modules,
  projects,
  quickActions,
  universeStats,
  workspaceItems,
} from "@/lib/data";
import { CommandHero } from "./hero";
import { IdeasInMotion } from "./ideas";
import { ModuleDrawer } from "./module-drawer";
import { QuickActions } from "./quick-actions";
import { UniverseStatus } from "./status";
import { Workspace } from "./workspace";

export function CommandCenter() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [openModule, setOpenModule] = useState<Module | null>(null);
  const [, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get("module");
    const m = modules.find((mod) => mod.id === id);
    if (m) setOpenModule(m);
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const q = query.trim().toLowerCase();
  const visibleWorkspace = useMemo(
    () => (q ? workspaceItems.filter((w) => w.title.toLowerCase().includes(q)) : workspaceItems),
    [q],
  );

  function onAction(action: QuickAction) {
    const m = modules.find((mod) => mod.id === action.moduleId);
    if (m) setOpenModule(m);
  }

  function queueRun(m: Module) {
    const wf: Workflow = {
      id: `wf-${Date.now()}`,
      name: `${m.name} Run`,
      detail: "Queued from module console…",
      status: "Running",
    };
    setWorkflows((ws) => [wf, ...ws]);
    setToast(`${m.name}: new run queued and started.`);
    setOpenModule(null);
  }

  return (
    <EmpireShell
      breadcrumb="Shadow Command Center"
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search projects, stories, research, or people…",
      }}
    >
      <CommandHero />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <UniverseStatus stats={universeStats} />
        <QuickActions actions={quickActions} onAction={onAction} />
        <IdeasInMotion />
        <Workspace items={visibleWorkspace} onOpenItem={(id) => setToast(`Opening ${id}…`)} />
      </div>

      {openModule && (
        <ModuleDrawer
          module={openModule}
          projects={projects}
          onQueue={queueRun}
          onClose={() => setOpenModule(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {toast}
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--pink)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
```

Versi ini sengaja lint-bersih meskipun belum lengkap: `workflows` di-elide jadi `const [, setWorkflows]` karena daftar workflow baru dirender di bagian 11 (Task 26), dan `initialAlerts` / `feedItems` belum diimpor sama sekali. Task 26 menulis ulang file ini dan mengubah elide itu jadi `const [workflows, setWorkflows]` — **satu-satunya** perubahan pada baris tersebut. Jangan menambah state spekulatif di task ini supaya lint hijau.

- [ ] **Step 9: Pipeline + bukti**

```bash
pnpm turbo run lint typecheck build
find apps/web/src/components/command-center -name "*.tsx" | xargs wc -l | sort -rn | head
```

Expected: typecheck dan build hijau; setiap file < 150 baris. `index.tsx` versi ini ~110 baris dan versi Task 26 ~145 baris — kalau versi final lewat 150, pindahkan `queueRun` + state toast ke `components/command-center/use-command-center.ts` dan impor dari sana.

Belum ada bukti browser di task ini karena route belum dipindah. Bukti visual ada di Task 26 Step 8 dan Task 28.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/command-center
git commit -m "feat(command-center): bagian 1-5 + drawer modul"
```

### Task 26: Shadow Command Center bagian 6-11 + orkestrator final

**Files:**
- Create: `apps/web/src/components/command-center/pipeline.tsx`
- Create: `apps/web/src/components/command-center/collections.tsx`
- Create: `apps/web/src/components/command-center/projects.tsx`
- Create: `apps/web/src/components/command-center/studios.tsx`
- Create: `apps/web/src/components/command-center/map.tsx`
- Create: `apps/web/src/components/command-center/crew.tsx`
- Create: `apps/web/src/components/command-center/log.tsx`
- Create: `apps/web/src/components/command-center/item-drawer.tsx`
- Create: `apps/web/src/components/command-center/use-command-center.ts`
- Modify: `apps/web/src/components/command-center/index.tsx` (tulis ulang lengkap)
- Modify: `apps/web/src/lib/data.ts` (tambah `crewStats`)
- Modify: `apps/web/src/components/landing/crew.tsx` (pakai `crewStats`)

**Interfaces:**
- Consumes: `KanbanColumn`, `CollectionsGrid`, `WorldMap`, `CrewConstellation`, `ModuleCard`, `ZineCard`, `ZineCardRough`, `ZineImage` dari `@moonwitness/ui` (Task 6, 8, 9, 23, 24); `artSrc` (Task 1); `pipeline`, `collections`, `mapCities`, `projects`, `witnesses`, `feedItems`, `initialAlerts`, `initialWorkflows`, `modules` dari `@/lib/data`; `SectionHeading`, `CommandHero`, `UniverseStatus`, `QuickActions`, `IdeasInMotion`, `Workspace`, `ModuleDrawer` dari Task 25.
- Produces (dipakai Task 27-28):

```ts
function Pipeline(props: { columns: PipelineColumn[]; onOpenCard: (card: PipelineCard) => void }): JSX.Element
function Collections(props: { collections: Collection[]; onOpenCollection: (id: string) => void }): JSX.Element
function ProjectUniverse(props: { projects: Project[] }): JSX.Element
function Studios(props: { modules: Module[]; onOpen: (m: Module) => void }): JSX.Element
function UniverseMap(props: { cities: MapCity[]; selectedId: string | null; onSelect: (id: string) => void }): JSX.Element
function CrewOrbit(): JSX.Element
function MissionLog(props: {
  feed: FeedItem[];
  alerts: MissionAlert[];
  workflows: Workflow[];
  onDismissAlert: (id: string) => void;
  onToggleWorkflow: (id: string) => void;
}): JSX.Element

// item-drawer.tsx
export interface ItemDrawerDetail {
  title: string;
  subtitle: string;
  art?: ArtKey;
  rows: { label: string; value: string }[];
}
function ItemDrawer(props: { detail: ItemDrawerDetail; onClose: () => void }): JSX.Element

// use-command-center.ts
export interface CommandCenterState {
  query: string;
  setQuery: (v: string) => void;
  openModule: Module | null;
  detail: ItemDrawerDetail | null;
  toast: string | null;
  selectedCity: string | null;
  setSelectedCity: (id: string) => void;
  closeOverlays: () => void;
  alerts: MissionAlert[];
  visible: {
    workspace: WorkspaceItem[];
    pipeline: PipelineColumn[];
    collections: Collection[];
    projects: Project[];
    feed: FeedItem[];
    workflows: Workflow[];
  };
  onAction: (a: QuickAction) => void;
  onOpenModule: (m: Module) => void;
  onOpenWorkspaceItem: (id: string) => void;
  onOpenCard: (card: PipelineCard) => void;
  onOpenCollection: (id: string) => void;
  onQueue: (m: Module) => void;
  onDismissAlert: (id: string) => void;
  onToggleWorkflow: (id: string) => void;
}
export function useCommandCenter(): CommandCenterState
export function CommandCenter(): JSX.Element
```

State dipisah ke hook karena `index.tsx` versi final (11 bagian + 4 memo filter + 7 handler) lewat 150 baris kalau state dan JSX tinggal di satu file. Memisahkannya membuat `index.tsx` murni susunan, dan hook bisa dibaca sendiri.

Dua bagian di luar referensi §6 (bagian 10 dan 11) sudah dijamin spec. Task ini menambah satu lagi: **`ProjectUniverse`**, grid proyek yang menaut ke `/dock?q=<judul>`. Alasannya sama seperti §6.10-6.11 — halaman lama punya kemampuan itu (`mission-control.tsx:300-350`) dan §6 menjanjikan "tidak ada kemampuan yang hilang". Kalau owner mau persis seperti gambar, `projects.tsx` adalah yang pertama dihapus: hapus file, hapus satu baris render di `index.tsx`.

- [ ] **Step 1: `crewStats` jadi satu sumber**

Tambah di `apps/web/src/lib/data.ts`, tepat setelah `witnesses`:

```ts
export const crewStats: { label: string; target: number }[] = [
  { label: "CREW MEMBERS", target: 1324 },
  { label: "COUNTRIES", target: 87 },
  { label: "SIGNALS", target: 6912 },
];
```

Angka disalin dari `landing.tsx:178-180`. Lalu di `apps/web/src/components/landing/crew.tsx`, ganti array literal yang dikirim ke `CrewConstellation` dengan impor `crewStats` dari `@/lib/data`. Dua halaman memakai angka yang sama; kalau tidak disatukan, salah satu akan menyimpang saat angka diperbarui.

- [ ] **Step 2: `pipeline.tsx` (§6.6)**

```tsx
import type { PipelineCard, PipelineColumn } from "@moonwitness/types";
import { KanbanColumn } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface PipelineProps {
  columns: PipelineColumn[];
  onOpenCard: (card: PipelineCard) => void;
}

export function Pipeline({ columns, onOpenCard }: PipelineProps) {
  return (
    <section aria-labelledby="cc-pipeline-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-pipeline-heading"
        title="EDITORIAL"
        accent="PIPELINE"
        note="click a card, no dragging"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <KanbanColumn key={column.stage} column={column} onOpenItem={onOpenCard} />
        ))}
      </div>
    </section>
  );
}
```

`grid-cols-1` ditulis eksplisit (Global Constraints: track implisit bikin overflow di 390px). Catatan "no dragging" sengaja terlihat — §D6 menolak drag-and-drop, dan pengguna yang datang dari tool kanban lain perlu tahu kenapa kartunya tidak bisa diseret.

- [ ] **Step 3: `collections.tsx` (§6.7)**

```tsx
import type { Collection } from "@moonwitness/types";
import { CollectionsGrid } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface CollectionsProps {
  collections: Collection[];
  onOpenCollection: (id: string) => void;
}

export function Collections({ collections, onOpenCollection }: CollectionsProps) {
  return (
    <section aria-labelledby="cc-collections" className="scroll-mt-24">
      <SectionHeading
        id="cc-collections"
        title="COLLECTIONS"
        accent="OVERVIEW"
        note={`${collections.length} live`}
      />
      <CollectionsGrid collections={collections} onOpenCollection={onOpenCollection} />
    </section>
  );
}
```

`id="cc-collections"` = anchor sidebar item **Collections** (Task 21).

- [ ] **Step 4: `projects.tsx` (di luar referensi)**

Markup disalin dari `mission-control.tsx:310-349`, dengan `next/image` + `artSrc` (Task 17) dan `Link` (bukan `<a>`) supaya navigasi tetap client-side:

```tsx
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@moonwitness/types";
import { artSrc } from "@/lib/art";
import { SectionHeading } from "./section-heading";

export function ProjectUniverse({ projects }: { projects: Project[] }) {
  return (
    <section aria-labelledby="cc-projects-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-projects-heading"
        title="PROJECT"
        accent="UNIVERSE"
        note={`${projects.length} tracked`}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dock?q=${encodeURIComponent(p.title)}`}
            className="group min-w-0 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel-2)]"
          >
            <div className="relative h-20 overflow-hidden">
              <Image
                src={artSrc(p.image)}
                alt=""
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition: p.imagePosition }}
                sizes="160px"
              />
              <span className="absolute bottom-1 left-1 font-brush text-[11px] leading-tight text-white drop-shadow-[1px_1px_0_#000]">
                {p.title.toUpperCase()}
              </span>
            </div>
            <div className="p-2">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ background: `${p.color}22`, color: p.color }}
              >
                {p.status}
              </span>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full" style={{ width: `${p.progress}%`, background: p.color }} />
              </div>
              <div className="mt-1 text-right text-[9px] text-zinc-500">{p.progress}%</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

`ZineImage` tidak dipakai di sini karena posisi crop per proyek (`p.imagePosition`) tidak bisa dilewatkan ke manifest — `ZineImage` membaca posisi dari `ARTWORK`. `next/image` tetap menghasilkan avif/webp lewat konfigurasi Task 17.

- [ ] **Step 5: `studios.tsx` (§6.8)**

Tile-nya adalah `ModuleCard` yang sudah dipindah ke paket di Task 9 — §6.8 memang "dua tile promosi yang menyalakan drawer modul", persis perilaku `ModuleCard`. Menulis tile baru di sini akan menduplikasi ikon berwarna, nama brush, dan ringkasan stats yang sudah ada.

```tsx
import type { Module } from "@moonwitness/types";
import { ModuleCard } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

const STUDIO_IDS = ["story-forge", "poster-lab"];

export interface StudiosProps {
  modules: Module[];
  onOpen: (m: Module) => void;
}

export function Studios({ modules, onOpen }: StudiosProps) {
  const studios = STUDIO_IDS.map((id) => modules.find((m) => m.id === id)).filter(
    (m): m is Module => Boolean(m),
  );
  return (
    <section aria-labelledby="cc-studios" className="scroll-mt-24">
      <SectionHeading id="cc-studios" title="STORY STUDIO" accent="/ POSTER FORGE" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {studios.map((m) => (
          <ModuleCard key={m.id} module={m} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
```

`STUDIO_IDS` harus ada di `modules`. Cek sebelum menulis:

```bash
grep -n 'id: "story-forge"\|id: "poster-lab"' apps/web/src/lib/data.ts
```

Expected: dua baris. Kalau salah satu tidak ada, tile-nya hilang diam-diam karena `.filter(Boolean)` — jadi kalau grep hanya menemukan satu, perbaiki id di `STUDIO_IDS` mengikuti data, jangan menambah modul baru ke `lib/data.ts`.

Ini juga jawaban untuk pertanyaan "masih ada yang memakai `ModuleCard` setelah grid modul lama dihapus?" — ya, bagian 8. Tanpa pemakaian ini, Task 9 memindahkan komponen yang langsung jadi kode mati.

- [ ] **Step 6: `map.tsx` (§6.9)**

```tsx
import type { MapCity } from "@moonwitness/types";
import { WorldMap, ZineCard } from "@moonwitness/ui";
import { GlobeIcon } from "@moonwitness/ui/icons";
import { SectionHeading } from "./section-heading";

export interface UniverseMapProps {
  cities: MapCity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UniverseMap({ cities, selectedId, onSelect }: UniverseMapProps) {
  const selected = cities.find((c) => c.id === selectedId);
  return (
    <section aria-labelledby="cc-map-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-map-heading"
        title="UNIVERSE"
        accent="MAP"
        note={`${cities.length} cities`}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <WorldMap cities={cities} selectedId={selectedId} onSelect={onSelect} />
        <ZineCard className="min-w-0 p-4">
          <h3 className="flex items-center gap-2 font-brush text-lg text-white">
            <GlobeIcon className="h-4 w-4 text-[var(--blue)]" />
            CITY DETAIL
          </h3>
          {selected ? (
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-[10px] tracking-wider text-zinc-500">CITY</dt>
                <dd className="font-brush text-2xl text-[var(--pink)]">{selected.city}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-wider text-zinc-500">SIGNALS</dt>
                <dd className="text-sm text-zinc-200">{selected.signals}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Pick a node on the map, or use the city list beside it.
            </p>
          )}
        </ZineCard>
      </div>
    </section>
  );
}
```

Panel detail adalah alasan `WorldMap` terkendali (Task 24). Kalimat kosong menyebut daftar kota karena node SVG sengaja tidak focusable — jalur keyboard ada di `<ul>` tombol yang dirender `WorldMap` sendiri.

- [ ] **Step 7: `crew.tsx` (§6.10)**

```tsx
import { CrewConstellation } from "@moonwitness/ui";
import { crewStats, witnesses } from "@/lib/data";
import { SectionHeading } from "./section-heading";

export function CrewOrbit() {
  return (
    <section aria-labelledby="cc-crew" className="scroll-mt-24">
      <SectionHeading
        id="cc-crew"
        title="CREW"
        accent="ORBIT"
        note={`${witnesses.length} witnesses`}
      />
      <CrewConstellation witnesses={witnesses} stats={crewStats} />
    </section>
  );
}
```

Tidak ada prop `cta`: di landing slot itu diisi `<Link>` ke `/dock`, di sini pengguna sudah di dalam dashboard jadi tidak perlu ajakan keluar. `id="cc-crew"` = anchor sidebar **Crew**.

- [ ] **Step 8: `log.tsx` (§6.11)**

Gabungan tiga panel lama (`mission-control.tsx:353-460`): ACTIVE WORKFLOWS, COMMAND FEED, MISSION ALERTS. Workflow ikut digabung karena `queueRun` menulis ke daftar itu — tanpa panelnya, menekan QUEUE NEW RUN hanya memunculkan toast dan hasil kerjanya tidak pernah terlihat.

```tsx
import type { FeedItem, MissionAlert, Workflow } from "@moonwitness/types";
import { ZineCardRough } from "@moonwitness/ui";
import { Bolt, Crown } from "@moonwitness/ui/icons";
import { SectionHeading } from "./section-heading";

export interface MissionLogProps {
  feed: FeedItem[];
  alerts: MissionAlert[];
  workflows: Workflow[];
  onDismissAlert: (id: string) => void;
  onToggleWorkflow: (id: string) => void;
}

const STATUS_TEXT: Record<Workflow["status"], string> = {
  Running: "text-[var(--green)]",
  Queued: "text-[var(--blue)]",
  Paused: "text-[var(--yellow)]",
};

export function MissionLog({
  feed,
  alerts,
  workflows,
  onDismissAlert,
  onToggleWorkflow,
}: MissionLogProps) {
  const running = workflows.filter((w) => w.status === "Running").length;
  return (
    <section aria-labelledby="cc-log" className="scroll-mt-24">
      <SectionHeading id="cc-log" title="MISSION" accent="LOG" note={`${running} running`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ZineCardRough className="min-w-0 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-brush text-lg text-white">
            ACTIVE WORKFLOWS <Crown className="h-4 w-6 text-[var(--yellow)]" />
          </h3>
          <div className="divide-y divide-[var(--line)]">
            {workflows.map((w) => (
              <div key={w.id} className="flex items-center gap-3 py-2.5">
                <Bolt className={`h-4 w-3 shrink-0 ${STATUS_TEXT[w.status]}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-200">{w.name}</p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {w.status === "Paused" ? "Paused by operator" : w.detail}
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] ${STATUS_TEXT[w.status]}`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-current ${w.status === "Running" ? "pulse-dot" : ""}`}
                  />
                  {w.status}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleWorkflow(w.id)}
                  aria-label={w.status === "Running" ? `Pause ${w.name}` : `Resume ${w.name}`}
                  className="min-h-11 rounded border border-[var(--line)] px-3 text-[10px] text-zinc-300 hover:border-[var(--pink)] hover:text-[var(--pink)]"
                >
                  {w.status === "Running" ? "Pause" : "Run"}
                </button>
              </div>
            ))}
            {workflows.length === 0 && <p className="py-4 text-sm text-zinc-500">No workflows match.</p>}
          </div>
        </ZineCardRough>

        <ZineCardRough className="min-w-0 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-brush text-lg text-white">
            COMMAND FEED <Crown className="h-4 w-6 text-[var(--yellow)]" />
          </h3>
          <div className="divide-y divide-[var(--line)]">
            {feed.map((f) => (
              <div key={f.id} className="flex items-start gap-2 py-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: f.color }} />
                <p className="min-w-0 flex-1 text-xs leading-snug text-zinc-300">{f.text}</p>
                <span className="shrink-0 text-[10px] text-zinc-600">{f.ago}</span>
              </div>
            ))}
            {feed.length === 0 && <p className="py-4 text-sm text-zinc-500">No feed items match.</p>}
          </div>
        </ZineCardRough>

        <ZineCardRough className="min-w-0 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-brush text-lg text-white">
            MISSION ALERTS <Crown className="h-4 w-6 text-[var(--yellow)]" />
          </h3>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
              >
                <span
                  className={`font-brush text-sm ${a.level === "high" ? "text-[var(--red)]" : a.level === "medium" ? "text-[var(--yellow)]" : "text-[var(--blue)]"}`}
                >
                  !
                </span>
                <p className="min-w-0 flex-1 text-xs text-zinc-300">{a.text}</p>
                <span className="text-[10px] text-zinc-600">{a.ago}</span>
                <button
                  type="button"
                  onClick={() => onDismissAlert(a.id)}
                  aria-label={`Dismiss alert: ${a.text}`}
                  className="min-h-11 min-w-11 text-zinc-500 hover:text-[var(--pink)]"
                >
                  ✕
                </button>
              </div>
            ))}
            {alerts.length === 0 && <p className="py-2 text-xs text-zinc-500">All clear. The sky is quiet.</p>}
          </div>
        </ZineCardRough>
      </div>
    </section>
  );
}
```

`--red` sudah ada di `theme.css` (Task 4). Tiga kelas warna status diringkas ke `STATUS_TEXT` karena dipakai dua kali per baris; nilainya disalin persis dari `mission-control.tsx:367` dan `:376`. Dua tombol kecil lama (`px-2 py-1`, `px-1`) dinaikkan ke `min-h-11` sesuai Task 16.

- [ ] **Step 9: `item-drawer.tsx`**

Satu drawer untuk tiga sumber (workspace item, kartu pipeline, koleksi). Shell-nya menyalin `module-drawer.tsx` supaya dua drawer di halaman ini terasa sama.

```tsx
import type { ArtKey } from "@moonwitness/types";
import { ZineImage } from "@moonwitness/ui";

export interface ItemDrawerDetail {
  title: string;
  subtitle: string;
  art?: ArtKey;
  rows: { label: string; value: string }[];
}

export interface ItemDrawerProps {
  detail: ItemDrawerDetail;
  onClose: () => void;
}

export function ItemDrawer({ detail, onClose }: ItemDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${detail.title} detail`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="zine-card-rough absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-wider text-zinc-500">{detail.subtitle.toUpperCase()}</p>
            <h2 className="font-brush mt-1 text-3xl leading-tight text-white">{detail.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="min-h-11 min-w-11 shrink-0 p-2 text-zinc-400 hover:text-[var(--pink)]"
          >
            ✕
          </button>
        </div>
        {detail.art && (
          <div className="relative mt-4 h-40 overflow-hidden rounded-md border-2 border-[var(--line)]">
            <ZineImage art={detail.art} sizes="(max-width: 768px) 100vw, 448px" />
          </div>
        )}
        <dl className="mt-5 divide-y divide-[var(--line)]">
          {detail.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[10px] tracking-wider text-zinc-500">{row.label.toUpperCase()}</dt>
              <dd className="min-w-0 truncate text-right text-xs text-zinc-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
```

`Escape` tidak ditangani di sini — satu handler di hook (Step 10) menutup drawer mana pun yang terbuka, termasuk `ModuleDrawer`.

- [ ] **Step 10: `use-command-center.ts`**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  Collection,
  FeedItem,
  MissionAlert,
  Module,
  PipelineCard,
  PipelineColumn,
  Project,
  QuickAction,
  WorkspaceItem,
  Workflow,
} from "@moonwitness/types";
import {
  collections,
  feedItems,
  initialAlerts,
  initialWorkflows,
  modules,
  pipeline,
  projects,
  workspaceItems,
} from "@/lib/data";
import type { ItemDrawerDetail } from "./item-drawer";

export interface CommandCenterState {
  query: string;
  setQuery: (v: string) => void;
  openModule: Module | null;
  detail: ItemDrawerDetail | null;
  toast: string | null;
  selectedCity: string | null;
  setSelectedCity: (id: string) => void;
  closeOverlays: () => void;
  alerts: MissionAlert[];
  visible: {
    workspace: WorkspaceItem[];
    pipeline: PipelineColumn[];
    collections: Collection[];
    projects: Project[];
    feed: FeedItem[];
    workflows: Workflow[];
  };
  onAction: (a: QuickAction) => void;
  onOpenModule: (m: Module) => void;
  onOpenWorkspaceItem: (id: string) => void;
  onOpenCard: (card: PipelineCard) => void;
  onOpenCollection: (id: string) => void;
  onQueue: (m: Module) => void;
  onDismissAlert: (id: string) => void;
  onToggleWorkflow: (id: string) => void;
}

export function useCommandCenter(): CommandCenterState {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [openModule, setOpenModule] = useState<Module | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [alerts, setAlerts] = useState<MissionAlert[]>(initialAlerts);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDrawerDetail | null>(null);

  useEffect(() => {
    const m = modules.find((mod) => mod.id === params.get("module"));
    if (m) setOpenModule(m);
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const closeOverlays = useCallback(() => {
    setOpenModule(null);
    setDetail(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeOverlays();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOverlays]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => ({
      workspace: q
        ? workspaceItems.filter((w) => w.title.toLowerCase().includes(q))
        : workspaceItems,
      pipeline: q
        ? pipeline.map((c) => ({
            ...c,
            items: c.items.filter((i) => i.title.toLowerCase().includes(q)),
          }))
        : pipeline,
      collections: q ? collections.filter((c) => c.name.toLowerCase().includes(q)) : collections,
      projects: q ? projects.filter((p) => p.title.toLowerCase().includes(q)) : projects,
      feed: q ? feedItems.filter((f) => f.text.toLowerCase().includes(q)) : feedItems,
      workflows: q
        ? workflows.filter((w) => `${w.name} ${w.detail}`.toLowerCase().includes(q))
        : workflows,
    }),
    [q, workflows],
  );

  function onAction(a: QuickAction) {
    const m = modules.find((mod) => mod.id === a.moduleId);
    if (m) setOpenModule(m);
  }

  function onOpenModule(m: Module) {
    setOpenModule(m);
  }

  function onOpenWorkspaceItem(id: string) {
    const item = workspaceItems.find((w) => w.id === id);
    if (!item) return;
    setDetail({
      title: item.title,
      subtitle: item.kind,
      rows: [
        { label: "STATUS", value: item.status },
        { label: "UPDATED", value: item.updatedAt },
      ],
    });
  }

  function onOpenCard(card: PipelineCard) {
    setDetail({
      title: card.title,
      subtitle: card.type,
      art: card.thumb,
      rows: [{ label: "TYPE", value: card.type }],
    });
  }

  function onOpenCollection(id: string) {
    const c = collections.find((x) => x.id === id);
    if (!c) return;
    setDetail({
      title: c.name,
      subtitle: "COLLECTION",
      art: c.cover,
      rows: [{ label: "EPISODES", value: String(c.episodes) }],
    });
  }

  function onQueue(m: Module) {
    const wf: Workflow = {
      id: `wf-${Date.now()}`,
      name: `${m.name} Run`,
      detail: "Queued from module console…",
      status: "Running",
    };
    setWorkflows((ws) => [wf, ...ws]);
    setToast(`${m.name}: new run queued and started.`);
    setOpenModule(null);
  }

  function onDismissAlert(id: string) {
    setAlerts((list) => list.filter((a) => a.id !== id));
    setToast("Alert dismissed.");
  }

  function onToggleWorkflow(id: string) {
    setWorkflows((ws) =>
      ws.map((w) =>
        w.id === id ? { ...w, status: w.status === "Running" ? "Paused" : "Running" } : w,
      ),
    );
  }

  return {
    query,
    setQuery,
    openModule,
    detail,
    toast,
    selectedCity,
    setSelectedCity,
    closeOverlays,
    alerts,
    visible,
    onAction,
    onOpenModule,
    onOpenWorkspaceItem,
    onOpenCard,
    onOpenCollection,
    onQueue,
    onDismissAlert,
    onToggleWorkflow,
  };
}
```

`queueRun`, `toggleWorkflow`, dan filter query disalin dari `mission-control.tsx:185-230` — perilakunya tidak berubah, hanya tempatnya. `setSelectedCity` bertipe `(id: string) => void` (bukan `string | null`) karena `WorldMap.onSelect` hanya memilih; mengosongkan pilihan dilakukan lewat `closeOverlays` tidak diperlukan — panel detail punya fallback "Pick a node".

- [ ] **Step 11: Tulis ulang `index.tsx`**

```tsx
"use client";

import { Star4 } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import { mapCities, modules, projects, quickActions, universeStats } from "@/lib/data";
import { Collections } from "./collections";
import { CommandHero } from "./hero";
import { CrewOrbit } from "./crew";
import { IdeasInMotion } from "./ideas";
import { ItemDrawer } from "./item-drawer";
import { MissionLog } from "./log";
import { ModuleDrawer } from "./module-drawer";
import { Pipeline } from "./pipeline";
import { ProjectUniverse } from "./projects";
import { QuickActions } from "./quick-actions";
import { Studios } from "./studios";
import { UniverseMap } from "./map";
import { UniverseStatus } from "./status";
import { Workspace } from "./workspace";
import { useCommandCenter } from "./use-command-center";

export function CommandCenter() {
  const cc = useCommandCenter();

  return (
    <EmpireShell
      breadcrumb="Shadow Command Center"
      search={{
        value: cc.query,
        onChange: cc.setQuery,
        placeholder: "Search projects, stories, research, or people…",
      }}
    >
      <CommandHero />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <UniverseStatus stats={universeStats} />
        <QuickActions actions={quickActions} onAction={cc.onAction} />
        <IdeasInMotion />
        <Workspace items={cc.visible.workspace} onOpenItem={cc.onOpenWorkspaceItem} />
        <Pipeline columns={cc.visible.pipeline} onOpenCard={cc.onOpenCard} />
        <Collections collections={cc.visible.collections} onOpenCollection={cc.onOpenCollection} />
        <ProjectUniverse projects={cc.visible.projects} />
        <Studios modules={modules} onOpen={cc.onOpenModule} />
        <UniverseMap cities={mapCities} selectedId={cc.selectedCity} onSelect={cc.setSelectedCity} />
        <CrewOrbit />
        <MissionLog
          feed={cc.visible.feed}
          alerts={cc.alerts}
          workflows={cc.visible.workflows}
          onDismissAlert={cc.onDismissAlert}
          onToggleWorkflow={cc.onToggleWorkflow}
        />
      </div>

      {cc.openModule && (
        <ModuleDrawer
          module={cc.openModule}
          projects={projects}
          onQueue={cc.onQueue}
          onClose={cc.closeOverlays}
        />
      )}
      {cc.detail && <ItemDrawer detail={cc.detail} onClose={cc.closeOverlays} />}

      {cc.toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {cc.toast}
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--pink)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
```

Aturan impor di file ini: data **statis** (`mapCities`, `modules`, `projects`, `quickActions`, `universeStats`) diimpor langsung dari `@/lib/data`; data **yang bisa difilter atau berubah** (`cc.visible.*`, `cc.alerts`) datang dari hook. `collections` tidak diimpor di sini karena yang dirender adalah hasil filternya. Campur keduanya dan halaman akan menampilkan angka yang tidak ikut menyempit saat pengguna mengetik di search topbar.

Urutan render = urutan §6 (1→11) dengan `ProjectUniverse` disisipkan setelah §7. Urutan ini yang menentukan anchor mana yang menyala saat scroll, jadi jangan diacak.

- [ ] **Step 12: Pipeline + bukti browser**

```bash
pnpm turbo run lint typecheck build
find apps/web/src/components/command-center -name "*.ts*" | xargs wc -l | sort -rn | head -20
```

Expected: hijau; tidak ada file ≥ 150 baris.

Route masih menunjuk `MissionControl` lama, jadi untuk melihat halaman baru **jangan** mengubah `app/mission-control/page.tsx` di task ini. Render sementara lewat halaman dev buangan:

```bash
mkdir -p apps/web/src/app/__cc-preview
cat > apps/web/src/app/__cc-preview/page.tsx <<'EOF'
import { Suspense } from "react";
import { CommandCenter } from "@/components/command-center";

export default function CommandCenterPreview() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          LOADING THE EMPIRE…
        </div>
      }
    >
      <CommandCenter />
    </Suspense>
  );
}
EOF
```

`Suspense` wajib: `useSearchParams` di halaman tanpa boundary membuat build Next gagal ("useSearchParams() should be wrapped in a suspense boundary"). Fallback-nya disalin persis dari `app/mission-control/page.tsx` supaya Task 27 tinggal mengganti nama komponennya.

Start produksi (`BUILD` lalu server di 4317), buka `/__cc-preview`, dan periksa 11 bagian §6 hadir berurutan: hero, UNIVERSE STATUS (4 angka + LIVE), QUICK ACTIONS (4 tombol), panel halftone, RECENT WORKSPACE ITEMS, EDITORIAL PIPELINE (4 kolom: 8/4/6/48 + "+N MORE"), COLLECTIONS (4 tile), PROJECT UNIVERSE, STORY STUDIO/POSTER FORGE (2 tile), UNIVERSE MAP (8 kota), CREW ORBIT, MISSION LOG (3 panel).

Lalu klik dan catat:
1. Quick Action "New Episode" → drawer modul terbuka, QUEUE NEW RUN → toast + baris baru di ACTIVE WORKFLOWS.
2. Tile Story Studio → drawer modul yang sama.
3. Kartu pipeline → `ItemDrawer` dengan gambar.
4. Tile koleksi → `ItemDrawer`.
5. Baris workspace → `ItemDrawer` tanpa gambar.
6. Daftar kota di samping peta → panel CITY DETAIL terisi.
7. Ketik "moon" di search topbar → workspace/pipeline/koleksi/proyek/feed menyempit.
8. `Escape` saat drawer terbuka → drawer tertutup.
9. `scrollWidth` di 390px ≤ 390.

Ambil SHOT ke `.verify/phase4-task26/` (3 viewport). **Hapus `apps/web/src/app/__cc-preview/` sebelum commit** — halaman pratinjau tidak boleh ikut masuk repo:

```bash
rm -rf apps/web/src/app/__cc-preview
```

Matikan server, verifikasi port bebas (`netstat -ano | grep :4317` harus kosong).

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/components/command-center apps/web/src/lib/data.ts apps/web/src/components/landing/crew.tsx
git commit -m "feat(command-center): bagian 6-11 + orkestrator final"
```

`git status` setelahnya harus bersih dari `__cc-preview`.

### Task 27: Tukar route ke `CommandCenter`, hapus Mission Control lama

Satu commit ini yang membuat halaman baru terlihat publik. Sebelum commit, route masih menunjuk halaman lama dan semua file baru tidak terjangkau — jadi tidak ada keadaan antara di mana `/mission-control` setengah jadi.

**Files:**
- Modify: `apps/web/src/app/mission-control/page.tsx`
- Delete: `apps/web/src/components/mission-control.tsx`
- Modify: `packages/ui/src/base.css` (hapus blok `orbit diagram`)

**Interfaces:**
- Consumes: `CommandCenter` (Task 26).
- Produces: route `/mission-control` yang merender Shadow Command Center dengan metadata title baru.

- [ ] **Step 1: Ganti isi `app/mission-control/page.tsx`**

```tsx
import { Suspense } from "react";
import { CommandCenter } from "@/components/command-center";

export const metadata = { title: "Shadow Command Center" };

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          LOADING THE EMPIRE…
        </div>
      }
    >
      <CommandCenter />
    </Suspense>
  );
}
```

URL tidak berubah (§D4: "menggantikan Mission Control di URL yang sama"). Hanya title dan komponennya. Nama fungsi `MissionControlPage` dibiarkan supaya diff-nya sekecil mungkin; Next tidak memakai nama itu untuk apa pun.

- [ ] **Step 2: Hapus komponen lama**

```bash
git rm apps/web/src/components/mission-control.tsx
grep -rn "mission-control\"\|from \"@/components/mission-control\"\|OrbitDiagram\|orbitNodes" apps/web/src packages | grep -v "app/mission-control"
```

Expected: grep 0 baris. Kalau masih ada yang mengimpor `MissionControl`, selesaikan dulu — jangan meninggalkan impor menggantung yang cuma ketahuan saat build.

`ModuleCard`, `ModuleGlyph`, dan `MODULE_GLYPHS` tetap hidup: dipakai `module-drawer.tsx` dan `studios.tsx` (Task 26 Step 5).

- [ ] **Step 3: Hapus CSS orbit dari `packages/ui/src/base.css`**

§D7 menghapus `OrbitDiagram`, jadi CSS-nya ikut. Hapus **persis** blok ini (di dalam `@layer components`, hasil pemindahan `globals.css:293-306` di Task 4):

```css
  /* ---- orbit diagram ---- */
  @keyframes spin-slow {
    to {
      transform: rotate(360deg);
    }
  }
  .orbit-ring {
    transform-origin: center;
    animation: spin-slow 60s linear infinite;
  }
  .orbit-ring-rev {
    transform-origin: center;
    animation: spin-slow 90s linear infinite reverse;
  }
```

Dan hapus dua baris pemilih dari blok reduced-motion yang **tidak ber-layer** (hasil pemindahan `globals.css:396-398`):

```css
  .marquee-track,
  .orbit-ring,
  .orbit-ring-rev,
  .pulse-dot,
```

jadi:

```css
  .marquee-track,
  .pulse-dot,
```

`spin-slow` hanya dipakai dua kelas orbit (`grep -rn "spin-slow" apps/web/src packages` harus 0 baris setelah penghapusan), jadi keyframe-nya aman dibuang. Jangan menyentuh `pulse-dot` — dipakai `log.tsx` dan `world-map.tsx`.

- [ ] **Step 4: Cek re-export tipe sementara sudah hilang**

Task 1 menambahkan re-export tipe di `lib/data.ts` dan Task 11-13 yang menghapusnya. Verifikasi, jangan berasumsi:

```bash
grep -n "export type {" -A 10 apps/web/src/lib/data.ts
```

Expected: 0 baris. Kalau masih ada, hapus bloknya sekarang dan perbaiki impor di file yang masih mengambil tipe dari `@/lib/data` (pindah ke `@moonwitness/types`) — meninggalkan re-export berarti dua sumber kebenaran untuk tipe yang sama.

- [ ] **Step 5: Pipeline + bukti browser**

```bash
VER
```

Expected: hijau semua, termasuk 4 tes `@moonwitness/assets`.

Start produksi di 4317, buka `/mission-control`, dan periksa:
1. Tab browser berjudul "Shadow Command Center" (metadata).
2. 11 bagian §6 hadir berurutan + PROJECT UNIVERSE.
3. Sidebar: item **Dashboard** menyala saat halaman di bagian atas; scroll ke bawah → **Episodes**, lalu **Collections**, **Research**, **Crew**, **Mission Log** menyala bergantian (IntersectionObserver Task 21 baru punya elemen untuk diamati sekarang).
4. Klik **Story Studio** di sidebar → URL jadi `/mission-control?module=story-forge` dan drawer modul terbuka.
5. Klik **Archive** → `/dock`; klik **Dashboard** di `/dock` → kembali ke `/mission-control` dan scroll ke `#cc-top`.
6. `Escape` menutup drawer.
7. `scrollWidth` ≤ lebar viewport di 390, 768, 1440.

```bash
SHOT phase4
```

Bandingkan `.verify/phase4/mission-control-*.png` dengan `.verify/phase0/mission-control-*.png`. **Perbedaan yang diniatkan** (catat di ledger, jangan diperbaiki):
- judul hero "SHADOW COMMAND CENTER" dan artwork rooftop baru;
- grid modul 3 kolom + OrbitDiagram hilang, diganti 11 bagian;
- sidebar 10 item (sejak Task 21).

**Yang tidak boleh berubah**: lebar dan warna sidebar, topbar, kartu zine, palet, dan perilaku drawer modul.

Matikan server dan pastikan port bebas.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/mission-control/page.tsx packages/ui/src/base.css apps/web/src/lib/data.ts
git commit -m "feat(command-center): ganti Mission Control dengan Shadow Command Center"
```

`git rm` di Step 2 sudah men-stage penghapusan `mission-control.tsx`, jadi file itu ikut ter-commit di sini. Verifikasi isinya sebelum commit:

```bash
git status --short
git diff --cached --stat
```

Expected: hanya empat path di atas (page.tsx, mission-control.tsx terhapus, base.css, dan data.ts bila Step 4 menemukan sisa). Kalau ada path lain, `git restore --staged <path>` dan selidiki — jangan menyapu WIP lain ke commit ini.

Rollback fase 4 = `git revert` commit ini plus commit Task 25, 26, 21, 20, 19 (urutan terbalik).

### Task 28: Gerbang fase 4 (fidelity + keyboard + overflow)

Gerbang spec §7 fase 4: "9 bagian §6 hadir semua; keyboard menjangkau sidebar, kanban, dan map; drawer modul terbuka dari Quick Actions; pipeline hijau; tidak ada overflow horizontal di 390/768/1440." Task ini juga menutup bagian 10-11 dan PROJECT UNIVERSE (R8), karena ketiganya sudah dirender sejak Task 26.

**Files:**
- Modify: `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (catat hasil gerbang)
- Create: `.verify/phase4/*` (tidak di-commit)
- Modify: apa pun yang gagal di Step 2-7 (commit terpisah, sebelum commit dokumen)

**Interfaces:**
- Consumes: hasil Task 19-27.
- Produces: bukti terukur bahwa §6 terpasang lengkap, dan baseline fidelity untuk fase 5.

- [ ] **Step 1: Pipeline + ukuran file**

```bash
VER
find apps/web/src/components -name "*.ts*" | xargs wc -l | sort -rn | head -20
```

Expected: semua hijau; tidak ada satu pun file ≥ 150 baris. `index.tsx` command-center ~90 baris, `use-command-center.ts` ~180 baris — **hook bukan komponen**, jadi batas 150 baris (§7) tidak berlaku padanya; yang berlaku adalah batas untuk file komponen. Kalau owner membaca 180 baris sebagai pelanggaran, pecah hook-nya jadi `use-command-center.ts` (state + effect) dan `use-command-center-filters.ts` (memo + handler); jangan menghapus perilaku untuk mengejar angka.

- [ ] **Step 2: Semua anchor ada dan unik**

```bash
grep -rno 'id="cc-[a-z-]*"' apps/web/src/components/command-center | sort
for a in cc-top cc-workspace cc-collections cc-studios cc-crew cc-log; do printf "%s -> " "$a"; grep -rl "id=\"$a\"" apps/web/src/components/command-center | tr '\n' ' '; echo; done
```

Expected: 12 id berbeda (`cc-top`, `cc-status-heading`, `cc-quick-heading`, `cc-ideas-heading`, `cc-workspace`, `cc-pipeline-heading`, `cc-collections`, `cc-projects-heading`, `cc-studios`, `cc-map-heading`, `cc-crew`, `cc-log`), masing-masing tepat satu file. Enam anchor di loop kedua adalah enam target sidebar Task 21 — kalau satu saja kosong, item sidebar itu tidak pernah menyala dan §D5 ("satu item, satu tujuan") gagal.

- [ ] **Step 3: Build + start produksi**

```bash
BUILD
pnpm --filter @moonwitness/web start -p 4317 &
```

Buka `/mission-control` di browser sungguhan (bukan hanya snapshot DOM).

- [ ] **Step 4: 11 bagian §6 + PROJECT UNIVERSE hadir berurutan**

Scroll dari atas ke bawah dan centang urutan ini persis:

| # | Bagian | Bukti yang harus terlihat |
|---|---|---|
| 1 | Hero | judul brush "SHADOW COMMAND CENTER", artwork rooftop, strip `PRIVATE // CREATE · CURATE · DEPLOY` |
| 2 | Universe Status | 4 `StatBlock`: 12 / 48 / 6 / 3.2M, badge LIVE hijau |
| 3 | Quick Actions | 4 tombol: New Episode, Create Poster, Write Story, Add to Collection |
| 4 | Ideas…In Motion | panel hitam dengan halftone, kalimat "DIFFERENT PEOPLE. SAME SKY." |
| 5 | Recent Workspace | 6 baris, tiap baris punya `StatusBadge` |
| 6 | Editorial Pipeline | 4 kolom DRAFT 8 / IN REVIEW 4 / APPROVED 6 / PUBLISHED 48, border atas berwarna, footer `+N MORE` |
| 7 | Collections | 4 tile, grayscale → warna saat hover |
| — | Project Universe | tile proyek dengan progress bar, menaut ke `/dock?q=` |
| 8 | Story Studio / Poster Forge | 2 `ModuleCard` |
| 9 | Universe Map | 8 node kota + garis koneksi, daftar kota di samping, panel CITY DETAIL |
| 10 | Crew Orbit | konstelasi + 3 angka CountUp (1324 / 87 / 6912) |
| 11 | Mission Log | 3 panel: ACTIVE WORKFLOWS, COMMAND FEED, MISSION ALERTS |

- [ ] **Step 5: Drawer terbuka dari Quick Actions (dan dari mana saja)**

1. Klik **New Episode** → drawer modul terbuka, judul modul benar.
2. Di dalam drawer klik **QUEUE NEW RUN** → drawer tertutup, toast muncul, baris baru `<Module> Run` ada di ACTIVE WORKFLOWS dengan status Running, hitungan "N running" di heading Mission Log naik satu.
3. Klik **Pause** pada baris itu → status jadi Paused, label tombol jadi Run, warna kuning.
4. Klik tile **Story Studio** → drawer yang sama terbuka.
5. Buka `/mission-control?module=poster-lab` langsung → drawer terbuka tanpa klik (efek `useSearchParams`).
6. Klik kartu pipeline → `ItemDrawer` dengan gambar; klik tile koleksi → `ItemDrawer` dengan gambar; klik baris workspace → `ItemDrawer` tanpa gambar.
7. Ketik `moon` di search topbar → workspace, pipeline, koleksi, proyek, feed, workflow menyempit; kosongkan → semua kembali.
8. Hapus satu alert (✕) → toast "Alert dismissed." dan daftar berkurang.

- [ ] **Step 6: Keyboard menjangkau sidebar, kanban, dan map**

Tanpa mouse, dari alamat `/mission-control`:
1. `Tab` pertama mendarat di **skip link** (Task 15), `Enter` → lompat ke `#main`.
2. `Tab` berikutnya masuk sidebar; tiap item punya cincin fokus kuning 3px yang terlihat; `Enter` pada **Collections** → halaman scroll ke §7 dan item itu menyala.
3. `Tab` mencapai kartu kanban di keempat kolom; `Enter` → `ItemDrawer` terbuka; `Escape` → tertutup dan fokus **kembali** ke kartu yang membukanya. Kalau fokus tidak kembali, tambahkan di `item-drawer.tsx`: simpan `document.activeElement` saat mount di orkestrator dan panggil `.focus()` lagi di `closeOverlays`. Ini bug nyata, bukan catatan.
4. `Tab` mencapai daftar kota di samping peta (tombol 44px, `aria-pressed`); `Enter` → panel CITY DETAIL terisi. Node SVG tidak perlu reachable — daftar ini jalur setaranya (Task 24).
5. `Tab` mencapai tombol Pause/Run dan ✕ alert di Mission Log.
6. Tidak ada jebakan fokus: dari drawer terbuka, `Tab` berulang tidak pernah keluar ke konten belakang secara tak terduga — kalau keluar, itu acceptable untuk v1 (drawer bukan modal focus-trap penuh), tapi **catat di ledger** sebagai utang.

- [ ] **Step 7: Overflow + target sentuh**

Di 390x844, 768x1024, dan 1440x900, jalankan di console:

```js
({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth })
```

Expected: `scroll <= inner` di ketiganya. Lalu jalankan snippet pengukuran 44px dari Task 16 Step 5 pada 390x844 di `/mission-control`. Expected: kosong, atau hanya sisa yang sudah dijelaskan di Task 16.

Periksa juga kolom kanban di 390px: harus 1 kolom (`grid-cols-1`), bukan 4 kolom yang terpotong.

- [ ] **Step 8: Fidelity ke referensi**

Buka `packages/assets/references/06-shadow-command-center.png` dan `.verify/phase4/mission-control-1440x900.png` berdampingan.

**Harus cocok**: urutan bagian 1-9, judul brush per bagian, 4 angka Universe Status, 4 kolom pipeline dengan angka 8/4/6/48 dan warna border per stage, 4 tile koleksi, 8 kota di peta, palet (magenta/biru/kuning di atas hitam).

**Boleh berbeda** (catat alasannya di ledger, jangan "diperbaiki" supaya mirip):
- artwork hero adalah hasil generate Task 19, bukan bitmap dari referensi;
- bagian 10, 11, dan PROJECT UNIVERSE tidak ada di referensi (R8);
- teks body berbahasa Inggris sesuai isi repo sekarang, bukan teks contoh di mock;
- node peta adalah posisi skema (`x`/`y` dari data), bukan peta dunia geografis yang akurat.

Kalau ada perbedaan di luar daftar itu — misalnya urutan bagian, jumlah kolom, atau warna stage — perbaiki kodenya, lalu ulangi Step 4.

- [ ] **Step 9: Lighthouse `/mission-control`**

```bash
mkdir -p .verify/phase4
npx --yes lighthouse@12 http://localhost:4317/mission-control --only-categories=performance --form-factor=mobile --screenEmulation.disabled --output=json --output-path=.verify/phase4/lh-mc-mobile.json --chrome-flags="--headless=new" --quiet
node -e "const r=JSON.parse(require('fs').readFileSync('.verify/phase4/lh-mc-mobile.json','utf8'));console.log('perf=',Math.round(r.categories.performance.score*100),'LCP=',r.audits['largest-contentful-paint'].displayValue,'bytes=',r.audits['total-byte-weight'].displayValue)"
```

Expected: `perf >= 85`, `bytes < 1 MB`. Halaman ini jauh lebih panjang dari sebelumnya, jadi kalau skor turun dari angka fase 3, penyebab paling mungkin adalah gambar hero (`shadow-command`) — pastikan `priority` hanya di hero dan semua `ZineImage` lain `loading="lazy"` (default Task 6).

Console: **0 error, 0 warning** di `/mission-control`.

- [ ] **Step 10: SHOT + matikan server**

```bash
SHOT phase4
netstat -ano | grep :4317
taskkill //PID <pid> //F
netstat -ano | grep :4317
```

Expected: 12 tangkapan layar ada; grep terakhir kosong.

- [ ] **Step 11: Catat gerbang di spec §7**

Tambah setelah baris `**Fase 4** — ...` di §7, isi dengan angka nyata:

```markdown
> Fase 4 selesai <tanggal>: 11 bagian §6 + PROJECT UNIVERSE terpasang berurutan, 6 anchor sidebar
> terverifikasi, drawer terbuka dari Quick Actions / tile studio / query ?module=, keyboard menjangkau
> sidebar + kanban + daftar kota, Lighthouse perf <angka> dan total byte <angka>, 0 error/warning console,
> tidak ada overflow horizontal di 390/768/1440. Perbedaan fidelity yang diniatkan: <daftar dari Step 8>.
```

- [ ] **Step 12: Commit**

```bash
git add docs/superpowers/specs/2026-11-11-frontend-design-system-design.md
git commit -m "docs: catat gerbang fase 4 (Shadow Command Center)"
```

Perbaikan kode dari Step 5-9 di-commit **terpisah** sebelum commit dokumen ini.

---

# FASE 5 — Tipografi

Spec §8 merekomendasikan (a) wordmark SVG + (b) ganti wajah brush, dengan (c) font kustom owner menyusul. Urutan di sini: wordmark dulu, lalu ganti wajah. Alasannya ada di Task 29 Step 1 — `textLength` membuat lebar lockup tidak bergantung pada font, jadi mengganti wajah setelahnya tidak bisa memecah layout brand.

Gerbang spec §7 fase 5: wordmark tajam di 1x/2x; heading memakai wajah baru; CLS < 0.1; pipeline hijau.

### Task 29: Wordmark SVG (§8a)

Spec §8 jujur soal batasannya: menggambar letterform sendiri adalah kerja desainer huruf. Yang bisa dikerjakan sebagai kode adalah **lockup SVG**: huruf dirender sebagai `<text>` di dalam SVG memakai `--font-brush`, lalu diberi tepi kasar lewat filter dan bayangan offset keras — bahasa visual yang sama dengan `drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]` yang sudah dipakai hero. Hasilnya tajam di semua ukuran, nol risiko lisensi, dan satu komponen untuk semua penempatan. Wajah yang dipakai saat task ini berjalan masih `Permanent_Marker`; Task 30 menggantinya dan lockup ini tidak perlu disentuh.

**Files:**
- Create: `apps/web/src/components/wordmark.tsx`
- Modify: `apps/web/src/components/site-nav/index.tsx` (baris brand di dalam `<header>` — salinan `site-nav.tsx:51-53` yang dipindah Task 13b; cari dengan `grep -n "MOON" apps/web/src/components/site-nav/index.tsx`)
- Modify: `apps/web/src/components/shell/index.tsx` (logo sidebar)
- Modify: `apps/web/src/components/landing/hero.tsx` (h1)
- Modify: `apps/web/src/app/shadow/page.tsx:96-98` (h1)

**Interfaces:**
- Consumes: `--font-brush` dari `theme.css` (Task 4) dan `--pink`; `useId` dari React (didukung Server Component, jadi file ini **tidak** perlu `"use client"`).
- Produces:

```ts
export interface WordmarkProps {
  variant: "moonwitness" | "shadow";
  className?: string;
  /** Bila diisi, SVG dinamai untuk screen reader; bila kosong, SVG disembunyikan (aria-hidden). */
  label?: string;
}
export function Wordmark(props: WordmarkProps): JSX.Element
```

- [ ] **Step 1: Tulis `wordmark.tsx`**

```tsx
import { useId } from "react";

const VARIANTS = {
  moonwitness: {
    viewBox: "0 0 320 72",
    textLength: 300,
    parts: [
      { text: "MOON", fill: "#ffffff" },
      { text: "WITNESS", fill: "var(--pink)" },
    ],
  },
  shadow: {
    viewBox: "0 0 190 72",
    textLength: 170,
    parts: [{ text: "SHADOW", fill: "#ffffff" }],
  },
} as const;

type Variant = (typeof VARIANTS)[keyof typeof VARIANTS];

const FONT = { fontFamily: "var(--font-brush)" } as const;

function Layer({ v, x, y, mono }: { v: Variant; x: number; y: number; mono?: string }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={48}
      textLength={v.textLength}
      lengthAdjust="spacingAndGlyphs"
      style={FONT}
    >
      {v.parts.map((p) => (
        <tspan key={p.text} fill={mono ?? p.fill}>
          {p.text}
        </tspan>
      ))}
    </text>
  );
}

export interface WordmarkProps {
  variant: keyof typeof VARIANTS;
  className?: string;
  label?: string;
}

export function Wordmark({ variant, className, label }: WordmarkProps) {
  const filterId = `mw-distress-${useId().replace(/:/g, "")}`;
  const v = VARIANTS[variant];
  return (
    <svg
      viewBox={v.viewBox}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <filter id={filterId} x="-5%" y="-25%" width="110%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <Layer v={v} x={18} y={60} mono="rgba(0,0,0,0.85)" />
        <Layer v={v} x={14} y={56} />
      </g>
    </svg>
  );
}
```

Tiga keputusan yang perlu dipahami sebelum mengubah apa pun:

1. **`textLength` + `lengthAdjust="spacingAndGlyphs"`** membuat lebar lockup deterministik (320×72 ≈ 4,4:1 untuk `moonwitness`, 190×72 untuk `shadow`) apa pun wajah font yang sedang ter-load. Tanpa ini, mengganti font di Task 30 mengubah lebar wordmark dan bisa memecah layout nav — dan itu akan terlihat seperti bug Task 30 padahal sebabnya di sini.
2. **`useId()` untuk id filter.** Dua wordmark di satu halaman (mis. sidebar + hero di `/`) akan menghasilkan dua `<filter id="…">` yang sama; SVG memakai id pertama untuk keduanya dan hasilnya tergantung urutan DOM. `useId` menjamin unik.
3. **`label` opsional.** Di nav dan sidebar, `<Link>` induk sudah punya `aria-label`, jadi SVG harus `aria-hidden` supaya tidak terbaca dua kali. Di hero, SVG **adalah** isi `<h1>`, jadi wajib dinamai.

File ini hanya boleh dipakai sebagai komponen React inline. **Jangan** pernah merujuknya sebagai `<img src="/wordmark.svg">`: SVG eksternal tidak mewarisi `--font-brush` maupun `--pink` dari halaman, jadi hurufnya jatuh ke fallback dan warnanya jadi hitam.

- [ ] **Step 2: Pasang di empat tempat**

| File | Sebelum | Sesudah |
|---|---|---|
| `site-nav/index.tsx` (brand, asalnya `site-nav.tsx:51-53`) | `<span className="font-brush text-xl tracking-wide text-white sm:text-2xl">MOON<span className="text-[var(--pink)]">WITNESS</span></span>` | `<Wordmark variant="moonwitness" className="h-6 w-auto sm:h-7" />` |
| `shell/index.tsx` (logo sidebar) | `<span className="font-brush text-2xl leading-none text-white">MOON<span className="text-[var(--pink)]">WITNESS</span></span>` | `<Wordmark variant="moonwitness" className="h-7 w-auto" />` |
| `landing/hero.tsx` (h1) | `<h1 className="font-brush relative text-[clamp(2.25rem,11vw,3.75rem)] …">MOON<span className="text-[var(--pink)]">WITNESS</span></h1>` | `<h1 className="relative"><Wordmark variant="moonwitness" label="Moonwitness" className="h-[clamp(2.25rem,11vw,3.75rem)] w-auto sm:h-24" /></h1>` |
| `app/shadow/page.tsx:96-98` | `<h1 className="font-brush text-4xl …">ENTER <span className="text-[var(--pink)]">THE SHADOW</span></h1>` | `<h1 className="font-brush text-4xl leading-tight text-white sm:text-5xl">ENTER<Wordmark variant="shadow" label="the shadow" className="mt-1 block h-9 w-auto sm:h-12" /></h1>` |

`Crown` di samping brand nav dan sidebar **dipertahankan** — hanya span teksnya yang diganti. Di hero, `drop-shadow-[…]` pada `<h1>` dilepas karena bayangan sudah digambar di dalam SVG; kalau dilepas dan lockup terlihat tipis, naikkan `scale` filter ke 2.2, jangan kembalikan drop-shadow (dua bayangan = tepi ganda).

Pada `app/shadow/page.tsx`, `label="the shadow"` (bukan `"SHADOW"`) supaya nama aksesibel `<h1>` terbaca "ENTER the shadow", mendekati teks lama.

- [ ] **Step 3: Pipeline + bukti visual**

```bash
VER
```

Start produksi di 4317, lalu periksa di browser:
1. `/` — hero: wordmark MOON putih + WITNESS magenta, tepi huruf sedikit kasar, bayangan hitam offset ke kanan-bawah. `Crown` kuning tetap di posisi lamanya.
2. `/` — nav sticky: tinggi header tetap `h-16`, wordmark tidak menyentuh batas atas/bawah, tidak menggeser menu.
3. `/shadow` — h1 "ENTER" lalu lockup SHADOW di baris berikutnya.
4. `/mission-control` — logo sidebar; buka/tutup drawer sidebar di 390px, wordmark tidak overflow.
5. DevTools → Elements → pastikan hanya ada **satu** `<filter>` per instance wordmark (id berbeda).
6. Matikan CSS/JS (view-source tidak perlu — cukup cek dengan screen reader atau `aria-hidden` di DOM): di nav, SVG `aria-hidden="true"`; di hero, `role="img" aria-label="Moonwitness"`.

```bash
SHOT phase5-task29
```

Bandingkan `.verify/phase4/` → `.verify/phase5-task29/`: **perbedaan yang diniatkan** hanya bentuk brand di 4 tempat itu. Ukuran blok, posisi `Crown`, dan layout sekitarnya tidak boleh bergeser lebih dari 2px.

Matikan server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/wordmark.tsx apps/web/src/components/site-nav/index.tsx apps/web/src/components/shell/index.tsx apps/web/src/components/landing/hero.tsx apps/web/src/app/shadow/page.tsx
git commit -m "feat(brand): wordmark SVG untuk MOONWITNESS dan SHADOW"
```

---

### Task 30: Ganti wajah brush ke display face OFL berbobot 700-900 (§8b)

`Permanent_Marker` hanya punya weight 400, jadi setiap heading yang ingin tebal mengandalkan faux-bold browser — itulah akar kesan lemah yang disebut §8. Task ini mengganti keluarganya; **satu titik perubahan** di `layout.tsx`, karena seluruh repo memakai `--font-brush` (janji §8c tetap berlaku untuk font kustom owner nanti).

**Files:**
- Create: `apps/web/src/fonts/<keluarga>/*.ttf` (file font, di-commit)
- Create: `apps/web/src/fonts/<keluarga>/OFL.txt` (lisensi, wajib ikut)
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (catat keluarga terpilih di §8b)

**Interfaces:**
- Consumes: `next/font/local`, `--font-brush`.
- Produces: `--font-brush` yang punya bobot 700 dan 900 nyata; tidak ada perubahan API untuk konsumen mana pun.

- [ ] **Step 1: Kriteria (hard gate, jangan dilonggarkan)**

Keluarga yang dipilih **harus** memenuhi semuanya:
1. Lisensi **SIL Open Font License 1.1** — file `OFL.txt` ada di direktori familinya dan menyebut nama famili yang sama.
2. Punya bobot **≥ 700**; idealnya 800/900 atau variable dengan rentang sampai 900.
3. Berkarakter **display/poster**, bukan body text: kontras tinggi atau condensed atau keduanya, dan tetap terbaca pada 12 karakter uppercase.
4. Tersedia sebagai file `.ttf` yang bisa diunduh dari repo `google/fonts` (bukan hanya lewat API CSS), supaya tidak ada dependensi jaringan saat build.
5. Mendukung subset **latin** (cukup untuk isi repo sekarang yang berbahasa Inggris).

Kalau satu kandidat gagal di nomor 1 atau 4, buang — jangan mencari jalan memakainya.

- [ ] **Step 2: Kandidat dan cara memutuskannya**

Periksa berurutan sampai satu lolos semua kriteria Step 1. Urutan ini adalah preferensi karakter, bukan tebakan ketersediaan — **ketersediaan diverifikasi di Step 3, bukan diasumsikan**:

| Urutan | Keluarga | Karakter | Kenapa cocok dengan zine |
|---|---|---|---|
| 1 | `Big Shoulders Display` | condensed poster, variable 100-900 | poster punk/Screenprint; bobot 900 memberi "kental dan kuat" yang diminta §8 |
| 2 | `Archivo` (variable 100-900, ada `Archivo Expanded`) | grotesque lebar | tebal tanpa jadi kartun; cocok bila owner ingin terasa lebih "koran tabloid" |
| 3 | `Shantell Sans` (variable 300-800) | marker/ playful | paling dekat dengan karakter spidol `Permanent_Marker`, tapi punya bobot nyata |
| 4 | `Kanit` (100-900) | condensed geometric | cadangan terakhir; netral |

Jangan memakai famili yang sudah dipakai repo (`Caveat` untuk `--font-hand`, `Space_Mono` untuk `--font-mono`) — `--font-brush` harus tetap berbeda dari `--font-hand`, atau dua peran tipografi itu kolaps jadi satu.

- [ ] **Step 3: Verifikasi lisensi + file, lalu unduh**

Untuk tiap kandidat, cek ke repo `google/fonts` (path famili mengikuti konvensi repo itu: `ofl/<familidirenderkecil>/`):

```bash
gh api repos/google/fonts/contents/ofl/bigshouldersdisplay --jq '.[].name'
```

Expected: daftar file berisi `OFL.txt` dan `.ttf` untuk tiap bobot. Kalau `gh` tidak tersedia atau repo tidak bisa diakses, buka `https://github.com/google/fonts/tree/main/ofl/<familidirenderkecil>` di browser — **jangan** mengunduh dari situs pihak ketiga yang tidak menyebut OFL.

Setelah satu keluarga lolos, unduh bobot yang dibutuhkan (700 dan 900; untuk variable font, satu file variable sudah cukup):

```bash
mkdir -p apps/web/src/fonts/<keluarga>
curl -fsSL -o apps/web/src/fonts/<keluarga>/OFL.txt \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/<familidirenderkecil>/OFL.txt"
curl -fsSL -o apps/web/src/fonts/<keluarga>/<File>.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/<familidirenderkecil>/<File>.ttf"
ls -l apps/web/src/fonts/<keluarga>
```

Expected: `OFL.txt` > 1 KB dan tiap `.ttf` > 20 KB. Buka `OFL.txt` dan pastikan baris copyright menyebut famili yang sama dengan yang diunduh — lisensi yang tidak cocok dengan file adalah alasan membuang kandidat, bukan detail yang bisa dirapikan nanti.

Jangan mengunduh lebih dari bobot yang dipakai: tiap file ikut ter-`git add` dan memperbesar repo.

- [ ] **Step 4: Ganti di `layout.tsx`**

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Caveat, Space_Mono } from "next/font/google";
import "./globals.css";

const brush = localFont({
  src: [
    { path: "../fonts/<keluarga>/<File>-700.ttf", weight: "700", style: "normal" },
    { path: "../fonts/<keluarga>/<File>-900.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-brush",
  display: "swap",
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow Bold", "sans-serif"],
});
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });
```

Untuk variable font, ganti `src` jadi satu entri tanpa `weight`:

```tsx
  src: [{ path: "../fonts/<keluarga>/<Family>-VariableFont_wght.ttf", style: "normal" }],
```

Sisa `layout.tsx` (`metadata`, `RootLayout`, `className={`${brush.variable} ${hand.variable} ${mono.variable}`}`) **tidak berubah**.

Tiga hal yang harus dimengerti di sini:

- **Tidak ada perubahan `font-weight` di file lain, dan itu disengaja.** CSS font matching untuk `font-weight: 400` ketika hanya 700 dan 900 yang tersedia akan memilih 700 — bukan mensintesis tebal palsu. Jadi semua `font-brush` di repo langsung naik ke bobot nyata tanpa satu pun edit kelas. Ini juga alasan kenapa kandidat single-weight tidak diterima: tanpa 700, browser kembali ke faux-bold.
- **`fallback` diisi wajah condensed/impact yang ada di sistem**, bukan `sans-serif` polos. `next/font` menghitung `size-adjust` dari metrik fallback; fallback yang jauh berbeda metriknya membuat CLS naik dan itu akan ketahuan di gerbang Task 31.
- **`display: "swap"`** sama dengan perilaku `next/font/google` sebelumnya.
- `packages/ui/src/theme.css:1028` menyimpan salinan fallback untuk konteks non-Next. Ganti barisnya jadi keluarga baru dengan daftar fallback yang sama:

```css
  --font-brush: "<keluarga>", Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
```

Nilai ini hanya berlaku bila class `next/font` tidak terpasang, tapi membiarkannya menyebut `Permanent Marker` berarti repo masih mengklaim bergantung pada wajah yang baru saja dibuang.

- [ ] **Step 5: Pipeline + bukti visual**

```bash
VER
```

Start produksi, buka `/`, `/dock`, `/shadow`, `/mission-control` di 1440x900 dan 390x844:
1. Semua heading `font-brush` terlihat jelas lebih tebal dari sebelumnya, dan **tidak** terlihat berbayang halus di tepi huruf (tanda faux-bold). Zoom 400% pada satu heading untuk memeriksa tepi.
2. Wordmark Task 29 ikut memakai wajah baru dan **lebarnya tidak berubah** (karena `textLength`).
3. Tidak ada teks yang terpotong atau melompat jadi dua baris di 390px — terutama judul kartu di dock, strip marquee, dan label sticker. Kalau ada yang meluber, perbaiki dengan `leading-*`/`text-*` di komponen itu, **jangan** dengan menurunkan bobot global.
4. `--font-hand` (Caveat) dan `--font-mono` (Space Mono) tidak berubah.

```bash
SHOT phase5-task30
```

Matikan server.

- [ ] **Step 6: Catat di spec + commit**

Di §8 poin (b), ganti kalimat "Keluarga spesifiknya ditentukan saat implementasi…" dengan keputusan nyata:

```markdown
Keluarga terpilih: **<nama famili>** (<bobot yang di-load>), SIL OFL 1.1, di-load lewat
`next/font/local` dari `apps/web/src/fonts/<keluarga>/`. Alasan: <satu kalimat karakter>.
File font + `OFL.txt` ikut di-commit supaya build tidak butuh jaringan.
```

```bash
git add apps/web/src/fonts apps/web/src/app/layout.tsx packages/ui/src/theme.css docs/superpowers/specs/2026-11-11-frontend-design-system-design.md
git commit -m "feat(type): ganti Permanent Marker dengan <keluarga> OFL berbobot 700/900"
```

`packages/ui/src/theme.css` ikut di-stage karena Step 4 mengubah baris fallback `--font-brush` di sana.

---

### Task 31: Gerbang fase 5 (ketajaman, CLS, lisensi)

Gerbang spec §7 fase 5: "wordmark tajam di 1x/2x; heading memakai wajah baru; CLS < 0.1; pipeline hijau." Task ini juga yang membuktikan font baru benar-benar ter-load, bukan fallback yang kebetulan mirip.

**Files:**
- Modify: `docs/superpowers/specs/2026-11-11-frontend-design-system-design.md` (catat hasil gerbang fase 5)
- Create: `.verify/phase5/*` (tidak di-commit)
- Modify: apa pun yang gagal di Step 2-7 (commit terpisah, sebelum commit dokumen)

**Interfaces:**
- Consumes: hasil Task 29-30.
- Produces: bukti terukur fase 5 selesai; baseline akhir untuk seluruh plan.

- [ ] **Step 1: Pipeline**

```bash
VER
BUILD
```

Expected: hijau semua, 4 tes `@moonwitness/assets`, build produksi sukses.

- [ ] **Step 2: Font baru benar-benar ter-load**

Start produksi di 4317, buka `/`, jalankan di console:

```js
({
  families: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`),
  brushOnText: getComputedStyle(document.querySelector("svg text")).fontFamily,
  heading: getComputedStyle(document.querySelector("h1, h2")).fontFamily,
})
```

Expected:
- `families` memuat `<keluarga>` dengan bobot `700` (dan `900` bila di-load) berstatus `loaded`.
- `brushOnText` dan `heading` menyebut `<keluarga>` di posisi pertama — **bukan** `Permanent Marker`, `Impact`, atau `cursive`.
- Tidak ada entri bernama `Permanent Marker` sama sekali. Kalau masih ada, `layout.tsx` masih mengimpornya; hapus.

Lalu pastikan tidak ada faux-bold:

```js
[...document.fonts].filter((f) => f.family.includes("<keluarga>")).map((f) => f.weight)
```

Expected: `["700", "900"]` (atau rentang variable). Kalau hasilnya `["400"]`, yang ter-load bukan bobot yang diminta Task 30 dan heading masih disintesis browser.

Matikan `Permanent_Marker` secara paksa untuk memastikan tidak ada jalur lain: `grep -rn "Permanent_Marker\|Permanent Marker" apps/web/src packages` harus 0 baris.

- [ ] **Step 3: Wordmark tajam di 1x dan 2x**

Ambil tangkapan layar brand di dua DPR. Pakai browser sungguhan, buka `/` lalu zoom 200% (atau DevTools → device toolbar → DPR 2) dan perhatikan tepi huruf wordmark hero:

Expected: tepi tetap tajam sebagai vektor — tidak ada pixelasi tangga, tidak ada tepi kabur keabu-abuan seperti bitmap yang diperbesar. Bayangan offset tetap blok warna padat, dan tepi kasarnya berasal dari filter (bergerigi halus), bukan dari artifact kompresi.

Bandingkan juga dengan `.verify/phase4/landing-1440x900.png`: brand lama adalah teks HTML, brand baru adalah SVG. Tinggi blok dan posisi `Crown` tidak boleh bergeser lebih dari 2px.

Cek satu kegagalan khas: buka `/` dengan CSS dimatikan (DevTools → Rendered fonts, atau `document.querySelector("svg text")` → periksa `font-family` yang *dipakai*). Bila SVG jatuh ke font fallback, lockup tetap muat karena `textLength` — tapi karakternya salah. Itu harus diperbaiki di Task 29/30, bukan diterima.

- [ ] **Step 4: CLS < 0.1**

```bash
mkdir -p .verify/phase5
npx --yes lighthouse@12 http://localhost:4317/ --only-categories=performance --form-factor=mobile --screenEmulation.disabled --output=json --output-path=.verify/phase5/lh-landing-mobile.json --chrome-flags="--headless=new" --quiet
npx --yes lighthouse@12 http://localhost:4317/mission-control --only-categories=performance --form-factor=mobile --screenEmulation.disabled --output=json --output-path=.verify/phase5/lh-mc-mobile.json --chrome-flags="--headless=new" --quiet
node -e "for (const f of ['landing','mc']) { const r = JSON.parse(require('fs').readFileSync('.verify/phase5/lh-'+f+'-mobile.json','utf8')); console.log(f, 'perf=', Math.round(r.categories.performance.score*100), 'CLS=', r.audits['cumulative-layout-shift'].displayValue, 'LCP=', r.audits['largest-contentful-paint'].displayValue, 'bytes=', r.audits['total-byte-weight'].displayValue); }"
```

Expected: `CLS < 0.1` di keduanya, `perf >= 85`, `bytes < 1 MB`.

Bila CLS lewat 0.1, penyebab paling mungkin adalah metrik fallback yang tidak cocok (Task 30 Step 4). Perbaiki `fallback` di `layout.tsx` dengan wajah yang metriknya lebih dekat, atau tambahkan `adjustFontFallback: true` (default `next/font/local` adalah `true` untuk metric-compatible fallback — bila kamu menyetelnya `false`, kembalikan). **Jangan** memperbaikinya dengan menghapus `display: "swap"`: itu menukar CLS dengan teks tak terlihat.

Ulangi sekali untuk memisahkan variasi mesin dari regresi nyata sebelum menyimpulkan.

- [ ] **Step 5: Tidak ada teks yang meluber**

Buka keempat route di 390x844 dan periksa khusus tempat `font-brush` paling padat:
1. strip marquee di `/` (6 frasa) — tidak terpotong vertikal.
2. sticker "PEOPLE. PLACES. STORIES. …" di hero — tetap dalam bentuk sticker, tidak keluar dari rotasi.
3. judul kartu timeline di `/dock` (`font-brush text-sm`) — maksimal 2 baris, tidak menimpa tanggal.
4. heading kanban dan `StatBlock` di `/mission-control` — angka `3.2M` tidak terpotong.
5. wordmark SHADOW di `/shadow` — tidak melebihi lebar layar.

```js
({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth })
```

Expected: `scroll <= inner` di 390, 768, 1440 untuk keempat route.

- [ ] **Step 6: Lisensi ikut ter-commit**

```bash
git ls-files apps/web/src/fonts
grep -il "SIL OPEN FONT LICENSE" apps/web/src/fonts/*/OFL.txt
head -3 apps/web/src/fonts/*/OFL.txt
```

Expected: `OFL.txt` + file `.ttf` terdaftar di git (bukan hanya ada di disk), grep menemukan `OFL.txt`, dan baris copyright menyebut famili yang sama dengan yang di-load `layout.tsx`. Font berlisensi OFL boleh di-redistribusi bersama repo **dengan** salinan lisensinya — tanpa `OFL.txt` di commit, redistribusinya cacat.

Bila `git ls-files` kosong, file font ter-ignore. Cek:

```bash
git check-ignore -v apps/web/src/fonts/<keluarga>/OFL.txt
```

Expected: tidak ada output. Bila ada, `.gitignore` punya pola `*.ttf` atau `fonts/` — perbaiki gitignore-nya (tambahkan negasi `!apps/web/src/fonts/`), jangan memaksa dengan `git add -f` yang meninggalkan aturan menyesatkan.

- [ ] **Step 7: Console bersih + reduced-motion**

Keempat route, console terbuka, reload: **0 error, 0 warning**. Ulangi cek reduced-motion Task 18 Step 4 pada `/` (marquee berhenti, CountUp menampilkan angka akhir, tidak ada flicker/float) — wajah font baru tidak boleh mengubah perilaku itu, tapi fase 5 menyentuh `layout.tsx` yang memuat semua font.

- [ ] **Step 8: SHOT + matikan server**

```bash
SHOT phase5
netstat -ano | grep :4317
taskkill //PID <pid> //F
netstat -ano | grep :4317
```

Expected: 12 tangkapan layar; grep terakhir kosong.

Bandingkan `.verify/phase5/` dengan `.verify/phase0/` sebagai penutup seluruh plan. Perbedaan yang diniatkan terkumpul di: brand (wordmark SVG), ketebalan semua heading, hero `/mission-control` (artwork + judul baru), isi `/mission-control` (11 bagian + PROJECT UNIVERSE), sidebar (10 item), skip link dan cincin fokus, ukuran target sentuh, dan format gambar yang disajikan. Selain daftar itu, tidak boleh ada perbedaan.

- [ ] **Step 9: Catat gerbang di spec §7**

Tambah setelah baris `**Fase 5** — ...`:

```markdown
> Fase 5 selesai <tanggal>: wajah brush diganti ke **<keluarga>** (SIL OFL 1.1, bobot <…>),
> wordmark SVG terpasang di 4 tempat dan tajam di 1x/2x, CLS <angka> (`/`) dan <angka>
> (`/mission-control`), Lighthouse perf <angka>/<angka>, total byte <angka>, 0 error/warning console,
> tidak ada overflow horizontal di 390/768/1440. `OFL.txt` + file font ikut ter-commit.
```

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/specs/2026-11-11-frontend-design-system-design.md
git commit -m "docs: catat gerbang fase 5 (tipografi)"
```

Perbaikan kode dari Step 2-7 di-commit **terpisah** sebelum commit dokumen ini.

---

## Yang sengaja tidak ada di plan ini

- **§8(c) font kustom dari owner.** Tidak ada task untuk ini karena sumbernya belum ada. Jalurnya sudah disiapkan: `--font-brush` di `layout.tsx` (Task 30) dan `theme.css` adalah satu-satunya titik yang perlu diganti saat owner mengirim `.ttf`/`.glyphs`/lettering PNG. Wordmark Task 29 otomatis ikut karena membaca `var(--font-brush)`.
- **Backend, auth, dan `packages/core`.** Global Constraints. `lib/auth.ts`, `app/api/**`, dan logika login shadow tidak disentuh task mana pun.
- **Drag-and-drop kanban (§D6), peta geografis akurat, data waktu nyata.** Ketiganya ditolak di spec dan tidak muncul sebagai task tersembunyi.
- **Visual-regression suite otomatis.** §9 menolak lane CI baru; bukti visual di plan ini adalah tangkapan layar manual di `.verify/` yang tidak di-commit.
- **Push, deploy, PR.** Tidak ada task yang melakukannya. Bila owner mau, itu permintaan terpisah setelah plan ini selesai.
