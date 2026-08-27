# Dashboard Monitoring Penyerapan Anggaran

Pusat Data, Informasi dan Komunikasi Publik — Kementerian Imigrasi dan Pemasyarakatan
Satuan Kerja 694677 · Program WA.7858 · TA 2026

Dashboard monitoring penyerapan anggaran berbasis HTML statis dengan Google Sheets
sebagai database dan Google Apps Script sebagai API.

## Isi repositori

| File | Peran |
|---|---|
| `index.html` | Dashboard publik/pimpinan — KPI, grafik, tabel hierarki, modal data dukung |
| `admin.html` | Panel admin — form input pencairan (POST ke Apps Script) |
| `data-source.js` | **Satu-satunya konfigurasi** (`CONFIG`) + data contoh/fallback |
| `support.js` | Runtime pendukung halaman (wajib diunggah) |
| `Code.gs` | Backend Google Apps Script (GET + POST + seeder data awal) |
| `PANDUAN-INTEGRASI.md` | SOP lengkap: deploy database, frontend, maintenance, hak akses |

## Setup singkat

1. **Database** — buat Google Sheets → Extensions → Apps Script → tempel `Code.gs` →
   ganti `ADMIN_TOKEN` → Run `seedDataAwal` (mengisi 32 baris anggaran otomatis).
2. **API** — Deploy → New deployment → Web app → *Execute as: Me*, *Who has access: Anyone*
   → copy URL `.../exec`.
3. **Frontend** — buka `data-source.js`, isi:
   ```js
   MODE: 'appscript',
   APPSCRIPT_URL: 'https://script.google.com/macros/s/...../exec',
   ADMIN_TOKEN: 'token yang sama dengan Code.gs'
   ```
4. **Hosting** — repositori ini statis: GitHub Pages (Settings → Pages → main / root),
   Netlify, atau Vercel. Wajib HTTPS.

Detail tiap langkah, format kolom sheet, troubleshooting, dan pengelolaan hak akses
ada di `PANDUAN-INTEGRASI.md`.

## Catatan keamanan

- Jangan commit `ADMIN_TOKEN` yang sebenarnya ke repositori publik. Untuk repo publik,
  lindungi `admin.html` di sisi hosting (Netlify Password Protection / Cloudflare Access)
  dan rotasi token secara berkala.
- Spreadsheet tetap privat: Apps Script berjalan sebagai pemilik (`Execute as: Me`).
