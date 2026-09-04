# Dashboard Monitoring Penyerapan Anggaran

Pusat Data, Informasi dan Komunikasi Publik — Kementerian Imigrasi dan Pemasyarakatan
Satuan Kerja 694677 · Program WA.7858 · TA 2026

Dashboard monitoring penyerapan anggaran + tracking berkas pertanggungjawaban.
HTML statis, Google Sheets sebagai database, Google Apps Script sebagai API.

## Isi repositori

| File | Peran |
|---|---|
| `index.html` | Dashboard publik/pimpinan — KPI, grafik, tabel hierarki, popup rincian |
| `admin.html` | Panel Admin/TU — kelola butir kegiatan + catat pencairan |
| `SubcomponentModal.dc.html` | Subkomponen: popup rincian akun (bar penyerapan + sisa) |
| `ActivityTable.dc.html` | Subkomponen: tabel butir kegiatan + tahapan berkas |
| `AdminControls.dc.html` | Subkomponen: form input/edit butir kegiatan |
| `data-source.js` | **Satu-satunya konfigurasi** (`CONFIG`) + data contoh/fallback |
| `support.js` | Runtime pendukung halaman (wajib) |
| `Code.gs` | Backend Apps Script (GET/POST + seeder data awal) |
| `PANDUAN-INTEGRASI.md` | SOP lengkap: deploy, maintenance, hak akses, troubleshooting |

## Alur tahapan berkas

```
1 Verifikasi Tim TU Pusdatin KP → 2 Verifikasi Tim Keuangan → 3 REVISI (merah) → 4 SP2D (hijau)
```

Dashboard publik menampilkan status ini read-only; hanya Panel Admin yang mengubahnya.

## Struktur database (Google Sheets)

| Sheet | Kolom |
|---|---|
| `Anggaran` | ID_Komponen, Tipe (UTAMA/SUB), Parent_ID, Nama_Kegiatan, Pagu_Anggaran, Total_Realisasi, Sisa_Anggaran |
| `Pencairan` | ID_Pencairan, ID_Komponen, Tanggal_Cair, Nominal_Pencairan, Keterangan, Link_Dokumen_Bukti |
| `Butir` | ID_Butir, ID_Komponen, Nama_Butir, Nominal, Tanggal_Terima, Status, Catatan, Link_Berkas |
| `Log` | Waktu, Aksi, Detail, Pengguna (otomatis) |

## Setup singkat

1. **Database** — Google Sheets → Extensions → Apps Script → tempel `Code.gs` →
   Run `seedDataAwal` (mengisi 32 baris anggaran + contoh pencairan & butir).
2. **API** — Deploy → New deployment → Web app → *Execute as: Me*,
   *Who has access: Anyone* → copy URL `.../exec`.
3. **Frontend** — `data-source.js`: set `MODE: 'appscript'` dan tempel `APPSCRIPT_URL`.
4. **Hosting** — statis: GitHub Pages / Netlify / Vercel. Wajib HTTPS.

## Endpoint API

```
GET  ?action=getAll                          → anggaran + pencairan + butir
GET  ?action=getButir&subkomponen=051.0M-522141 → butir 1 akun
POST {action:'addPencairan', ...}            → catat SP2D, auto-recalc realisasi
POST {action:'addButir', ...}                → catat berkas dari Tim Kerja
POST {action:'updateButir', ID_Butir, Status}→ ubah tahapan berkas
POST {action:'deleteButir', ID_Butir}        → hapus butir
```

## Real-time

Polling default: dashboard 5 menit (`CONFIG.REFRESH_MS`), admin 1 menit (`POLL_MS`).
Untuk push real-time, ganti pemanggilan `fetchAll()` dengan langganan WebSocket lalu
panggil `this.terapkan(data)` — titiknya ditandai komentar `⚡ REAL-TIME` di kode.
