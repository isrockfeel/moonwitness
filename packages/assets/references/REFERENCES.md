# Referensi visual

Salinan dari `ARTS/` di root repo dengan nama yang bisa dipakai sebagai acuan kerja.
`ARTS/` tetap utuh — itu tempat owner menaruh kiriman baru.

| File                           | Asal di `ARTS/`                    | Peran                                          |
| ------------------------------ | ---------------------------------- | ---------------------------------------------- |
| `01-landing.png`               | `image(1).png`                     | acuan layout `/`                               |
| `02-mission-control.png`       | `image (2).png` (dengan spasi)     | acuan lama `/mission-control`; digantikan `06` |
| `03-shadow-login.png`          | `image(3).png`                     | acuan layout `/shadow`                         |
| `04-dock-timeline.png`         | `image-gen-2(20261027-002736).png` | acuan layout `/dock`                           |
| `05-style-ska-poster.png`      | `image(2).png` (tanpa spasi)       | **gaya saja**, bukan layout                    |
| `06-shadow-command-center.png` | `image-gen-2.png`                  | acuan layout `/mission-control` yang baru      |

`raw/` berisi PNG sumber hasil generate yang jadi input pipeline optimasi
(`hero-witness`, `city-shadow`, `crew-rooftop`, `signal-tunnel`, `shadow-command`).

Enam file di atas diverifikasi berbeda satu sama lain (md5 unik), jadi tabel ini bukan tebakan.

## Artwork tambahan (generate 2026-11-11)

Enam artwork baru digenerate dengan bahasa visual yang sama (zine punk: halftone,
brush ink, magenta/biru/kuning neon, bulan raksasa; acuan gaya `05-style-ska-poster.png`).
PNG sumber ada di `raw/` dan `apps/web/public/art/`, varian avif/webp dihasilkan
`pnpm --filter @moonwitness/assets optimize`.

| Kunci            | Isi                                       | Slot utama                                    |
| ---------------- | ----------------------------------------- | --------------------------------------------- |
| `night-shift`    | pekerja shift malam + generator           | The Batteries, Pendeta Online                 |
| `signal-sky`     | pita gelombang cahaya di langit           | Skyline Broadcast, Cities Never Sleep         |
| `fog-voices`     | perekam kaset di atas desa berkabut       | Voices in the Fog                             |
| `mirror-archive` | arsip kaset + cermin kota neon            | The Other Side, Allahi Promise                |
| `crew-wall`      | kolase polaroid potret kru                | Zill, koleksi Crew Portraits                  |
| `crowd-moon`     | kerumunan tangan terangkat di bawah bulan | Join the Crew, New Worlds, koleksi Expansions |

## Mockup comic (generate 2026-11-14)

Mockup terpilih dan eksplorasi visual dashboard/landing disimpan terpisah dari
artwork produksi di [`mockups/README.md`](./mockups/README.md). Nama dan folder
mengelompokkan gambar berdasarkan halaman dan arah visual. Semua PNG di sana
hanya referensi konsep; jangan gunakan sebagai artwork produksi atau background
halaman secara langsung.
