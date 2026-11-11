# Spec: Design System Frontend Moonwitness

Tanggal: 2026-11-11
Status: disahkan lisan oleh owner, menunggu review dokumen
Batas kerja: **UI/UX dan frontend saja.** Auth, API, database, dan deploy dikerjakan tim lain dan tidak disentuh di spec ini.

---

## 1. Masalah yang diselesaikan

1. Design system zine hidup di dalam app (`apps/web/src/app/globals.css` 408 baris + `components/zine.tsx`), sementara `packages/ui` berisi komponen scaffold lama (Button indigo, Card, Badge) yang **tidak dipakai sama sekali**. Fondasi enterprise-nya ada, tapi paket UI-nya palsu.
2. Tiga file komponen terlalu besar untuk diubah dengan aman: `landing.tsx` 571, `mission-control.tsx` 552, `dock.tsx` 537 baris.
3. Aset berat: 4 PNG di `public/art` total ~11 MB (terbesar 4 MB), dipakai langsung sebagai gambar LCP.
4. Referensi ARTS punya nama file tidak jelas (`image (2).png` vs `image(2).png` beda isi), sehingga tidak bisa dipakai sebagai acuan kerja yang stabil.
5. Ada referensi baru `image-gen-2.png` = **Shadow Command Center**, dashboard yang jauh lebih kaya dari Mission Control yang sekarang.

## 2. Keputusan yang sudah diambil

| # | Keputusan | Alasan |
|---|---|---|
| D1 | `packages/ui` jadi **komponen penuh**: primitif + komposit, bukan hanya token | Owner memilih pendekatan 2 |
| D2 | Tipe domain pindah ke `packages/types` (paket baru, nol dependensi) | Komposit butuh tipe tanpa menyeret zod/next ke UI |
| D3 | `packages/assets` memegang manifest + skrip optimasi; **byte tetap di `apps/web/public/art`** | Next hanya melayani `public/` dari app; paket tak bisa jadi docroot |
| D4 | Shadow Command Center **menggantikan** isi `/mission-control`, URL tetap | Owner memilih "ganti Mission Control" |
| D5 | 10 item sidebar = satu tujuan masing-masing (bagian di halaman ini, drawer modul, atau route), bukan 10 route | 7 route kosong akan tampak hidup tapi mati |
| D6 | Kanban editorial pipeline **tanpa drag-and-drop** di v1 | Memindahkan item antar kolom adalah operasi backend |
| D7 | `OrbitDiagram` dihapus (komponen + pemakaian) | Halaman barunya tidak punya orbit; menyimpannya = kode mati |
| D8 | ARTS **disalin** ke `packages/assets/references/` dengan nama rapi, `ARTS/` dibiarkan utuh | `ARTS/` tetap jadi tempat owner menaruh kiriman baru |
| D9 | Tipografi dikerjakan **paling terakhir** | Mengganti font mengubah metrik spasi di semua halaman |
| D10 | `lib/data.ts` tetap di app, tidak dipaketkan | Itu sambungan tunggal yang nanti diganti tim backend |

## 3. Topologi paket

```
packages/types      tipe domain saja, nol dependensi runtime
packages/ui         token CSS + primitif + ikon + komposit
packages/assets     manifest artwork + skrip optimasi + referensi ternama
packages/core       (tidak berubah) env, format, result
apps/web            routing, data, komposisi halaman, semua yang menyentuh router
```

### 3.1 `packages/types`

Baru. `exports: { ".": "./src/index.ts" }`, tanpa dependensi.

Mendeklarasikan: `EraId`, `Era`, `EventKind`, `TimelineEvent`, `Module`, `ModuleStats`, `Witness`, `Workflow`, `FeedItem`, `MissionAlert`, `Project` — dipindah apa adanya dari bentuk yang sudah ada di `lib/data.ts` — ditambah tipe baru untuk dashboard:

```ts
export type ItemStatus = "DRAFT" | "READY" | "IN REVIEW" | "APPROVED" | "PUBLISHED";
export type PipelineStage = "DRAFT" | "IN REVIEW" | "APPROVED" | "PUBLISHED";

export interface UniverseStat { label: string; value: string; trend?: string; tone: "pink" | "blue" | "yellow" | "green"; }
export interface QuickAction { id: string; label: string; icon: "plus" | "image" | "pen" | "stack"; moduleId: string; }
export interface WorkspaceItem { id: string; title: string; kind: EventKind; updatedAt: string; status: ItemStatus; }
export interface PipelineColumn { stage: PipelineStage; count: number; more: number; items: PipelineCard[]; }
export interface PipelineCard { id: string; title: string; type: EventKind; thumb: ArtKey; }
export interface Collection { id: string; name: string; episodes: number; cover: ArtKey; }
export interface MapCity { id: string; city: string; x: number; y: number; signals: number; }
```

`ArtKey` adalah union kunci artwork (`"hero-witness" | "city-shadow" | "crew-rooftop" | "signal-tunnel" | "shadow-command"`), supaya komponen UI tidak pernah menerima path mentah.

### 3.2 `packages/ui`

`package.json` exports:

```json
{ ".": "./src/index.ts", "./icons": "./src/icons/index.ts",
  "./theme.css": "./src/theme.css", "./base.css": "./src/base.css" }
```

Struktur:

```
src/theme.css        token: --ink --panel --panel-2 --paper --pink --blue --yellow
                     --purple --red --green --line + fallback --font-brush/-hand/-mono
src/base.css         scrollbar, halftone, grain, sticker, tape, zine-card, btn-zine,
                     brush-underline, zine-input, keyframes, blok prefers-reduced-motion
src/primitives/      Sticker, Tape, ZineCard, ZineCardRough, ZineButton, ZineBadge,
                     ZineInput, Marquee, Halftone, Grain
src/icons/           Crown, Bolt, Smiley, Star4, Splatter, ArrowRight, PlayIcon,
                     PauseIcon, GlobeIcon, SearchIcon, EyeIcon
src/composites/      TransmissionCard, ModuleCard, EventCard, EventDetail, EraBand,
                     ArchiveStrip, CrewConstellation, StatusBadge, StatBlock,
                     QuickActionGrid, WorkspaceList, KanbanColumn, WorldMap,
                     CollectionsGrid
```

`Button`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Badge` yang lama **dihapus**. Tidak ada pemakainya di repo (sudah diverifikasi), jadi ini bukan breaking change.

Aturan internal paket:

- Tidak ada `next/*` di dalam `packages/ui`. Komposit menerima `ArtKey` dan merender `<img>` biasa — bukan `next/image`, bukan ReactNode asing. Konsekuensinya jelas dan disengaja: **gambar hero/LCP tetap di `apps/web`** dengan `next/image` + `priority`, karena optimasi §5 bergantung padanya. Paket tidak boleh ikut menanggung urusan runtime gambar.
- Komponen dengan state internal diberi `"use client"` dan harus swadaya (state tidak bocor ke tipe publik). Contoh: `TransmissionCard` memegang timer play/pause sendiri; `CrewConstellation` memegang pilihan witness sendiri plus region `aria-live`.
- Komponen yang perlu tahu pilihan ke dunia luar menerima callback: `KanbanColumn({ stage, items, onOpenItem })`, `WorldMap({ cities, onSelect })`.
- `href` tidak pernah di-resolve di paket; kartu merender isi, app yang membungkus `<Link>`.

Kontrak prop untuk yang paling sering dipakai:

```ts
TransmissionCard({ event: TimelineEvent, durationSeconds?: number })
ModuleCard({ module: Module, onOpen: (m: Module) => void })
EventCard({ event: TimelineEvent, selected: boolean })
EventDetail({ event: TimelineEvent, onRelated: (id: string) => void })
StatusBadge({ status: ItemStatus })
StatBlock({ stat: UniverseStat })
```

### 3.3 `packages/assets`

```
references/             01-landing.png … 06-shadow-command-center.png (salinan ARTS)
references/raw/         original generate dari vibe_images/
references/REFERENCES.md tabel acuan → route
src/index.ts            ARTWORK manifest + tipe ArtKey
scripts/optimize.mjs    pipeline sharp (AVIF + WebP, 480/960/1440/1920)
```

Manifest:

```ts
export const ARTWORK = {
  "hero-witness": { src: "/art/hero-witness.avif", fallback: "/art/hero-witness.webp",
    alt: "Saksi berjaket magenta menatap bulan di atas kota neon",
    position: "30% center", credit: "01-landing.png" },
  // city-shadow, crew-rooftop, signal-tunnel, shadow-command
} satisfies Record<ArtKey, ArtEntry>;
```

`scripts/optimize.mjs` dijalankan manual (`pnpm --filter @moonwitness/assets optimize`), **tidak** masuk CI — sesuai preferensi owner soal CI tipis. Output ditulis ke `apps/web/public/art/`.

### 3.4 Peta rename referensi

| Nama baru | Asal di `ARTS/` | Peran |
|---|---|---|
| `01-landing.png` | `image(1).png` | acuan `/` |
| `02-mission-control.png` | `image (2).png` (dengan spasi) | acuan lama `/mission-control`, digantikan D4 |
| `03-shadow-login.png` | `image(3).png` | acuan `/shadow` |
| `04-dock-timeline.png` | `image-gen-2(20261027-002736).png` | acuan `/dock` |
| `05-style-ska-poster.png` | `image(2).png` (tanpa spasi) | gaya saja, bukan layout |
| `06-shadow-command-center.png` | `image-gen-2.png` | acuan baru `/mission-control` |

Enam file ini sudah diverifikasi berbeda (md5 unik), jadi pemetaan di atas bukan tebakan.

## 4. Kontrak CSS

`apps/web/src/app/globals.css` menyusut menjadi:

```css
@import "tailwindcss";
@source "../../../../packages/ui/src";
@import "@moonwitness/ui/theme.css";
@import "@moonwitness/ui/base.css";
/* sisa: khusus app, jika ada */
```

- `@source` wajib menunjuk ke `packages/ui/src`, kalau tidak utility yang hanya dipakai di dalam paket tidak akan ter-generate. Ini **diverifikasi aktif**, bukan diasumsikan: lihat §7 gerbang fase 1.
- Font tetap di-load `next/font` di `layout.tsx` dan ditulis sebagai `--font-brush/-hand/-mono` di `<html>`. `theme.css` mendeklarasikan fallback (`cursive`, `ui-monospace`) supaya konsumen yang tidak memasang font tetap tampil wajar.
- Blok `prefers-reduced-motion` tetap **unlayered** di `base.css` agar menang atas utility. Ini mempertahankan perbaikan layering yang sudah dibuat di sesi ini; kalau ikut masuk `@layer components`, animasi tidak lagi bisa dimatikan.

## 5. Performa gambar

Kondisi sekarang: `hero-witness.png` 2,8 MB, `crew-rooftop.png` 4,0 MB, `city-shadow.png` 2,8 MB, `signal-tunnel.png` 1,5 MB.

Rencana: sharp menghasilkan AVIF + WebP pada 480/960/1440/1920 px dari satu sumber; `srcSet` diambil dari manifest; hero per halaman `priority`, sisanya lazy; `sizes` diset per penempatan (hero penuh, kartu 1/3, strip 240px).

Angka yang dituju: payload gambar LCP **< 400 KB** (dari 2,8 MB), total byte yang disajikan di halaman utama **< 1 MB**.

## 6. Shadow Command Center

Satu halaman di `/mission-control`, judul metadata "Shadow Command Center". Struktur mengikuti `06-shadow-command-center.png`:

1. **Hero** — judul brush "SHADOW COMMAND CENTER", artwork rooftop baru (`shadow-command`), strip "PRIVATE // CREATE · CURATE · DEPLOY".
2. **UNIVERSE STATUS** — `StatBlock` ×4 (12 stories active, 48 episodes published, 6 collections live, 3.2M total views) + badge LIVE.
3. **QUICK ACTIONS** — `QuickActionGrid`: New Episode, Create Poster, Write Story, Add to Collection. Setiap tombol membuka drawer modul yang sudah ada, jadi tidak ada tombol mati.
4. **IDEAS PEOPLE WORLDS IN MOTION** — panel hitam-putih halftone, statis.
5. **RECENT WORKSPACE ITEMS** — `WorkspaceList` dengan `StatusBadge` per baris.
6. **EDITORIAL PIPELINE** — `KanbanColumn` ×4 (DRAFT 8 / IN REVIEW 4 / APPROVED 6 / PUBLISHED 48), border berwarna per stage, klik kartu membuka drawer detail. Tanpa drag-and-drop (D6).
7. **COLLECTIONS OVERVIEW** — `CollectionsGrid` 4 tile.
8. **STORY STUDIO / POSTER FORGE** — dua tile promosi yang menyalakan drawer modul.
9. **UNIVERSE MAP** — `WorldMap` SVG: node kota (London, Istanbul, Seoul, Cairo, Tokyo, Lagos, São Paulo, Nairobi) + garis koneksi, `onSelect` membuka detail kota di panel samping.
10. **CREW ORBIT** — panel `CrewConstellation` dipakai ulang dari landing. Ini memberi tujuan nyata pada item sidebar Crew, bukan bagian yang ada karena referensinya minta begitu.
11. **MISSION LOG** — `Command Feed` dan `Mission Alerts` yang sudah ada digabung jadi satu bagian.

Referensi hanya menggambarkan 1–9. Bagian 10 dan 11 **ditambahkan di luar referensi** supaya setiap item sidebar punya tujuan dan perilaku yang sudah teruji tidak dibuang cuma karena tidak tergambarkan di mock. Kalau nanti kamu mau persis seperti gambar, dua bagian ini yang pertama saya hapus.

Sidebar `EmpireShell` diperluas ke 10 item sesuai referensi. Aturannya: **satu item, satu tujuan** — dan tujuannya harus salah satu dari ini.

| Item sidebar | Tujuan |
|---|---|
| Dashboard | scroll ke bagian 1–3 |
| Story Studio | buka drawer modul `story-forge` |
| Episodes | scroll ke bagian 5 |
| Poster Forge | buka drawer modul `poster-lab` |
| Collections | scroll ke bagian 7 |
| Research | scroll ke bagian 8 |
| Crew | scroll ke bagian 10 |
| Mission Log | scroll ke bagian 11 |
| Archive | route `/dock` |
| Settings | route `/shadow` |

Delapan item pertama adalah state di dalam halaman (scroll-into-view atau drawer), hanya dua yang keluar route. Pola `IntersectionObserver` untuk menandai item aktif sama dengan yang sudah dipakai `site-nav`.

Data baru (`universeStats`, `quickActions`, `workspaceItems`, `pipeline`, `collections`, `mapCities`) ditambahkan ke `lib/data.ts` dan tipenya diambil dari `packages/types`.

Yang hilang dari Mission Control lama: OrbitDiagram (D7) dan grid modul 3 kolom di sekelilingnya. Modul tetap bisa dibuka lewat Quick Actions (bagian 3), panel Story Studio/Poster Forge (bagian 8), dan drawer — jadi tidak ada kemampuan yang hilang, hanya tata letaknya yang diganti.

## 7. Pemecahan file + urutan fase

Target: setiap file komponen < 150 baris.

| Sekarang | Jadi |
|---|---|
| `components/landing.tsx` | `components/landing/{hero,signals,crew,archive,about,footer}.tsx` + orkestrator |
| `components/mission-control.tsx` | `components/command-center/{hero,status,quick-actions,pipeline,workspace,collections,map}.tsx` + orkestrator |
| `components/dock.tsx` | `components/dock/{hero,filter-bar,era-band,event-list,event-detail}.tsx` + orkestrator |
| `components/empire-shell.tsx` | `components/shell/{sidebar,topbar,notifications,profile-menu}.tsx` |

**Fase 0** — `git init` + commit baseline. *Selesai: `d2af4e7`.*

**Fase 1** — `packages/types`, tulis ulang `packages/ui`, buat `packages/assets`, `apps/web` jadi konsumen.

> **Fase 1 selesai 2026-11-11 (gerbang Task 10).** Pipeline frontend hijau 11/11 (paket backend `api`/`errors`/`schema`/`contracts` di-eksklusi: `'eslint' is not recognized`, cacat lingkungan milik tim lain). `packages/core` tetap **7 tes**; `packages/assets` **4 lulus + 1 skip** (skip = tes filesystem yang dibuka di Task 19). `@source` terbukti: `.18em` muncul 3× di CSS build. 0 pemakaian `next/*` di `packages/ui`/`packages/types`; `packages/types` tanpa blok `dependencies`; 0 path `/art/` mentah di `data.ts`. `scrollWidth` ≤ viewport di 4 route × 3 viewport (390px: 390/390/380/390). **Perbandingan visual `.verify/phase0` vs `.verify/phase1`: 12/12 dimensi halaman identik** (setelah tangkap pada keadaan settled). Selisih pixel yang tersisa seluruhnya terkurung di region gambar (profil baris + heatmap): (a) re-encode dari pipeline aset statis avif/webp menggantikan `next/image`, dan (b) beda state lazy-load antar sesi tangkap — keduanya konsekuensi arsitektur fase 1, bukan regresi; konten gambar, crop (`imagePosition` tetap diteruskan), teks, warna, spasi, tinggi section sama. **Satu catatan jujur:** `packages/ui/src/composites/event-detail.tsx` = 153 baris, melewati target <150 sejak dibuat di Task 7; pemecahan file besar memang tugas Fase 2 (gerbang §7 baris 228), jadi tidak dipotong paksa di task verifikasi ini.

Gerbang:
- `pnpm turbo run lint typecheck test build` hijau.
- **Bukti `@source` benar-benar memindai paket**, bukan sekadar build tanpa error: satu komponen di `packages/ui` memakai kelas `tracking-[0.18em]` yang tidak dipakai di bagian lain repo, lalu CSS hasil build di-grep untuk `0.18em`. Kelas itu harus ditemukan. Kalau tidak, style dari paket hilang dan ini harus ketahuan sekarang, bukan saat halaman tampil polos.
- Perbandingan visual 390×844 dan 1440×900 sebelum vs sesudah: tidak boleh ada perbedaan yang tidak disengaja. Perbedaan yang disengaja baru boleh muncul mulai fase 3.

**Fase 2** — pecah file, murni pemindahan.
Gerbang: pipeline hijau; perbandingan visual 3 viewport sama ketatnya dengan fase 1; dan `wc -l` membuktikan tidak ada file komponen di atas 150 baris.

> **Fase 2 selesai 2026-11-11 (gerbang Task 14).** File dipecah murni struktural: `landing` (Task 11), `dock` (Task 12), `empire-shell` → `shell/` (Task 13), `site-nav` → `site-nav/` (Task 13b), plus `event-detail.tsx` 153→131 (Task 14). **Ukuran:** satu-satunya file komponen ≥150 yang tersisa adalah `mission-control.tsx` (491) — pengecualian terencana R4 (Fase 4/Task 27 mengganti seluruh isinya dengan `command-center/*`; memecah lalu membuang = kerja dua kali), jadi TIDAK dipecah di Fase 2. Semua file lain <150. **Pipeline:** `typecheck build` web 2/2 hijau; `core` 7/7; `assets` 4+1skip (skip = tes filesystem Task 19). `lint` tetap gagal karena `eslint-config/base.js:57` (`tseslintPluginReact`) — cacat WIP backend di luar scope. **Visual:** `.verify/phase1` vs `.verify/phase2` — **12/12 dimensi halaman identik** (tangkap di viewport 1440/768/390, JANGAN sembunyikan scrollbar; menyembunyikannya menggeser lebar layout ~10px dan memunculkan diff palsu 45%). Diff piksel tersisa satu digit (0,5–9,2%), difus di pita gambar/grain/animasi; kontrol self-consistency build-sama dua-run = 0,00–0,04% membuktikan metode deterministik, dan `shadow` (tidak disentuh split mana pun) menunjukkan band noise yang sama → sisa % = varian environment, bukan regresi. **Netralitas struktural terbukti:** DOM `site-nav` byte-identical pra vs pasca split; panel `EventDetail` dock tetap merender `RELATED EVENTS` + tombol terkait; 0 error console. `scrollWidth` ≤ 390 di keempat route (390/390/380/390).

**Fase 3** — polish UX/a11y + jalankan `optimize.mjs`.
Gerbang: Lighthouse `/` dan `/mission-control` performa ≥ 85; LCP image < 400 KB; tidak ada error/peringatan console baru; semua target sentuh ≥ 44px di 390px; skip-link dan landmark benar; `prefers-reduced-motion` tetap mematikan animasi.

> **Fase 3 selesai 2026-11-11 (gerbang Task 18).** **Lighthouse (mobile, `--screenEmulation.disabled`):** perf **89** (`/`) dan **95** (`/mission-control`), keduanya ≥85; total byte **579 KiB** / **328 KiB** (<1 MB); elemen LCP = `hero-witness` w=1440 = **93 KB** (<400 KB). **Console:** 0 error, 0 warning di keempat route (`/`, `/dock`, `/mission-control`, `/shadow`) — peringatan tunggal yang muncul saat tangkap Task 17 terbukti internal Playwright, bukan console halaman. **Reduced-motion:** dengan `prefers-reduced-motion: reduce`, `marquee-track`/`float-y` = `animationName:none`, `scroll-behavior:auto`; `CountUp` (pakai rAF, tidak terblokir CSS) diberi guard `matchMedia` sehingga angka melompat ke nilai akhir (1.324 / 87 / 6.912) seketika — terverifikasi identik pada t=120ms dan t=2.120ms (tidak ada ramp). **Target sentuh 390×844:** semua kontrol in-scope dinaikkan — era dot `EraBand` dapat `::after:-inset-4` (box 46px; probe `elementFromPoint` mengonfirmasi hit ±18px dua sumbu, sama teknik witness dot Task 16), CTA signals/archive + link footer (landing & shadow) + brand site-nav/shadow dapat `max-lg:min-h-11` (footer shadow +`min-w-11` untuk lebar). **Sisa yang dijelaskan (bukan diabaikan):** skip-link 1×1 (keyboard-only, 179×48 saat fokus); witness dot 32–40px (`::after` → 44 efektif); seluruh kontrol `/mission-control` (orbit 25px, Pause/Run 25px, View All 16px, ✕ 21px) — halaman ini diganti total `command-center/` di Task 27, target sentuh dipegang ulang di sana; kontrol form login `/shadow` (toggle password 20px, checkbox 16px, forgot 16px) — domain tim auth, di luar scope. **Catatan lingkungan:** `turbo build` gagal (EXIT=1) karena `packages/orm/package.json` milik tim lain menjadi byte tidak-valid UTF-8 di tengah sesi; build web diverifikasi lewat `next build` langsung (EXIT=0) yang melewati graf workspace itu — kode task ini hijau. **Perbandingan visual Task 17 (`phase3-task17` vs `phase3-task16`): 12/12 hΔ0** (tanpa pergeseran layout); kontrol A/B build-sama memisahkan noise animasi dari re-encode AVIF↔WebP yang diniatkan; gambar dicek langsung tajam & utuh.

**Fase 4** — bangun Shadow Command Center + pass fidelity ke `06-shadow-command-center.png`, termasuk generate artwork `shadow-command` untuk hero (diizinkan oleh keputusan owner "boleh generate ulang bila perlu") lalu masukkan ke pipeline §5.
Gerbang: 9 bagian §6 hadir semua; keyboard menjangkau sidebar, kanban, dan map; drawer modul terbuka dari Quick Actions; pipeline hijau; tidak ada overflow horizontal di 390/768/1440.

**Fase 5** — tipografi (§8).
Gerbang: wordmark tajam di 1x/2x; heading memakai wajah baru; CLS < 0.1; pipeline hijau.

Setiap fase = satu commit. Rollback = `git revert` commit fase tersebut.

## 8. Tipografi

Keterbatasan yang jujur: membuat *typeface* sungguhan adalah kerja desainer huruf dengan font editor, bukan sesuatu yang bisa saya hasilkan sebagai kode. Yang bisa dikerjakan:

- **(a) Wordmark SVG kustom** untuk MOONWITNESS dan SHADOW — paling memberi kesan "kental dan kuat", nol risiko lisensi, tajam di semua ukuran. Dipakai di nav dan hero saja.
- **(b) Ganti wajah brush.** `Permanent_Marker` hanya punya weight 400, jadi tidak bisa ditebalkan dan faux-bold browser hasilnya buruk — inilah akar kesan lemah. Penggantinya: display face berlisensi **SIL OFL** yang punya bobot 700–900, di-subset ke Latin, di-load lewat `next/font/local`. Keluarga spesifiknya ditentukan saat implementasi dengan memeriksa lisensi dan ketersediaan file, bukan ditebak di spec.
- **(c) Font kustom betulan** begitu owner mengirim sumbernya (lettering PNG, `.glyphs`, atau `.ttf`). Jalur integrasinya sudah disiapkan: semua pemakaian font lewat `--font-brush/-hand/-mono`, jadi penggantiannya satu titik di `layout.tsx` + `theme.css`.

Rekomendasi: (a) + (b) di fase 5, (c) menyusul.

## 9. Verifikasi

- Otomatis murah saja: `lint`, `typecheck`, `test` (vitest di `packages/core` tetap 7 tes), `build`. Tidak ada lane CI baru, tidak ada visual-regression suite.
- Bukti visual: screenshot viewport tetap (390×844, 768×1024, 1440×900) diambil sebelum dan sesudah fase 1–2 untuk membuktikan "tidak ada perubahan tampilan", dan sesudah fase 3–5 untuk membuktikan perbaikan.
- Setiap klaim selesai disertai angka Lighthouse atau tangkapan layar, bukan keyakinan.
- Server verifikasi selalu dimatikan setelah dipakai (port 4317 dicek via `netstat` lalu `taskkill`).

## 10. Risiko

| Risiko | Mitigasi |
|---|---|
| `@source` tidak memindai `packages/ui`, hasil build kehilangan style | Gerbang fase 1 memeriksa kelas khusus di CSS build, bukan hanya "build sukses" |
| `"use client"` di dalam paket JIT tidak ter-transpile | `transpilePackages` sudah memuat `@moonwitness/ui`; diverifikasi di fase 1 dengan `TransmissionCard` |
| Membuang gambar menurunkan kualitas visual | Sumber PNG lama tetap di `references/raw/`; kalau hasil tidak cocok, generate ulang diizinkan |
| Restrukturisasi besar tanpa tes komponen | Baseline git + perbandingan screenshot per fase; revert satu commit |
| Bentrok dengan tim backend | Spec ini tidak menyentuh `lib/auth.ts`, `app/api/`, atau menambah dependensi runtime baru di app |
| Biner ~40 MB di git lokal | Tidak di-push; kalau nanti mau di-push, `references/` perlu LFS — keputusan terpisah |

## 11. Di luar cakupan

Backend, auth sungguhan, database, API, deploy, i18n, tema terang/gelap, drag-and-drop kanban, 11 route halaman terpisah, dan apa pun yang menyentuh `packages/core`.
