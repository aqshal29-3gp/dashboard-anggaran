# SOP Deploy & Maintenance
## Dashboard Monitoring Penyerapan Anggaran — Pusat Data, Informasi dan Komunikasi Publik

Dokumen ini panduan berurutan agar sistem berjalan penuh: database Google Sheets,
API Apps Script, dashboard publik, dan panel admin.

### Daftar file

| File | Peran | Perlu diedit? |
|---|---|---|
| `Code.gs` | Backend/API di Google Apps Script (GET + POST) | Ya — 1 baris token |
| `data-source.js` | **Satu-satunya tempat konfigurasi** frontend + data contoh | Ya — blok `CONFIG` |
| `Dashboard Penyerapan Anggaran.dc.html` | Dashboard publik / pimpinan | Tidak |
| `Admin Panel.dc.html` | Form input pencairan untuk admin | Tidak |
| `index.html` | Pengalih ke dashboard (wajib untuk GitHub Pages) | Tidak |
| `support.js` | Runtime — wajib diunggah bersama, tanpa ini halaman kosong | Tidak |
| `Dashboard Penyerapan Anggaran v1.dc.html` | Versi lama (1 sheet, tanpa hierarki) — arsip | Tidak |

### Arsitektur

```
Google Sheets (database)                Apps Script (API)            Frontend (statis)
┌─────────────────────────┐            ┌──────────────────┐         ┌──────────────────────┐
│ Sheet "Anggaran"        │◀──────────▶│ doGet  ?action=  │◀── GET ─│ Dashboard  (publik)  │
│ Sheet "Pencairan"       │            │ doPost addPencairan│◀─ POST ─│ Admin Panel (token)  │
│ Sheet "Log" (otomatis)  │            └──────────────────┘         └──────────────────────┘
└─────────────────────────┘
```

Relasi: `Pencairan.ID_Komponen` → `Anggaran.ID_Komponen`.
Setiap POST menambah 1 baris di `Pencairan`, lalu `Total_Realisasi` &
`Sisa_Anggaran` pada `Anggaran` dihitung ulang otomatis — untuk subkomponen
maupun komponen utama induknya.

---

# BAGIAN A — Deployment Database (Google Sheets + Apps Script)

## A1. Buat spreadsheet

1. Buka https://sheets.google.com → **Blank spreadsheet**.
2. Beri nama, misal `DB Penyerapan Anggaran TA 2026`.

## A2. Pasang Code.gs

1. **Extensions → Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel **seluruh isi file `Code.gs`** dari proyek ini.
3. Ganti satu baris ini dengan token acak Anda (mis. hasil password generator, 20+ karakter):
   ```js
   var ADMIN_TOKEN = 'GANTI_TOKEN_RAHASIA_ANDA';
   ```
4. **Save** (ikon disket).

## A3. Buat sheet + isi seluruh data secara OTOMATIS

Tidak perlu copy-paste manual. Cukup jalankan satu fungsi:

1. Di editor Apps Script, pilih fungsi **`seedDataAwal`** pada dropdown → klik **Run**.
2. Saat muncul permintaan izin: **Review permissions → pilih akun → Advanced →
   Go to (nama project) → Allow**. (Wajar; script hanya mengakses spreadsheet Anda sendiri.)
3. Selesai. Hasilnya:
   - Tab **`Anggaran`** & **`Pencairan`** dibuat lengkap dengan header dan baris judul dibekukan
   - **32 baris** anggaran (10 komponen utama + 22 subkomponen) terisi beserta pagu
   - **22 baris** contoh pencairan terisi
   - `Total_Realisasi` & `Sisa_Anggaran` dihitung otomatis
   - Format angka & lebar kolom dirapikan sendiri
4. Cek **Execution log** — akan tertulis: `Selesai: 32 baris Anggaran, 22 baris Pencairan.
   Total realisasi = Rp 8.129.356.992` (harus sama dengan JUMLAH SELURUHNYA di laporan).

### Varian

| Fungsi | Hasil |
|---|---|
| `seedDataAwal` | Pagu + 22 contoh pencairan (untuk demo/uji coba) |
| `seedPaguSaja` | **Hanya pagu**, sheet `Pencairan` dibiarkan kosong — pakai ini untuk mulai produksi dari nol lalu isi lewat Panel Admin |
| `setupSpreadsheet` | Hanya membuat sheet + header, tanpa data sama sekali |

> ⚠ `seedDataAwal` / `seedPaguSaja` **menghapus isi kedua sheet** sebelum mengisi ulang
> (header tetap). Jalankan hanya di awal, jangan setelah ada pencairan asli.

### Mengubah data awal

Angka pagu dan daftar kegiatan ada di array **`DATA_ANGGARAN`** (dan contoh pencairan di
**`DATA_PENCAIRAN`**) pada bagian bawah `Code.gs`. Untuk TA berikutnya, ganti isi array
tersebut lalu jalankan `seedPaguSaja` sekali.
Ganti juga `DOK_CONTOH` bila ingin tautan bukti default yang berbeda.

## A4. Struktur kolom (referensi)

Bagian ini hanya perlu dibaca bila Anda mengisi/mengedit sheet secara manual —
langkah A3 sudah membuat semuanya.

### Sheet 1 — `Anggaran`

| Kol | Header | Isi | Contoh |
|---|---|---|---|
| A | `ID_Komponen` | Kode unik. Untuk subkomponen gunakan pola `INDUK-AKUN` | `051.0M` / `051.0M-522141` |
| B | `Tipe` | `UTAMA` atau `SUB` | `UTAMA` |
| C | `Parent_ID` | Kode induk (kosongkan untuk `UTAMA`) | `051.0M` |
| D | `Nama_Kegiatan` | Uraian | `Pengamanan dan Pemeliharaan TI` |
| E | `Pagu_Anggaran` | Angka murni, format Number | `7445100000` |
| F | `Total_Realisasi` | **Diisi otomatis oleh script** — biarkan 0 saat awal | `0` |
| G | `Sisa_Anggaran` | **Diisi otomatis oleh script** | `0` |

Aturan:
- Kolom E–G harus **format Angka**, bukan teks (jangan pakai `Rp` / titik ribuan).
- `ID_Komponen` harus unik. Karena kode akun (mis. `521211`) muncul di banyak
  komponen, **wajib** memakai pola `INDUK-AKUN` agar tidak bentrok.
- Baris `UTAMA` tidak perlu diisi realisasinya — nilainya = jumlah subkomponen.

Contoh 6 baris pertama (sesuai laporan TA 2026 Satker 694677):

```
ID_Komponen       Tipe   Parent_ID  Nama_Kegiatan                          Pagu_Anggaran  Total_Realisasi
051.0A            UTAMA             Pengelolaan Data dan Informasi         76501000       0
051.0A-521211     SUB    051.0A     Belanja Bahan                          54901000       0
051.0A-522151     SUB    051.0A     Belanja Jasa Profesi                   21600000       0
051.0B            UTAMA             Pengelolaan Informasi dan Komunikasi    719780000      0
051.0B-524111     SUB    051.0B     Belanja Perjalanan Dinas Biasa          694230000      0
051.0B-524113     SUB    051.0B     Belanja Perjalanan Dinas Dalam Kota     25550000       0
```

> Baris di atas hanya contoh format. Semua 32 baris sudah terisi otomatis oleh
> `seedDataAwal` (langkah A3) — termasuk pagu yang sudah dicocokkan dengan laporan.

### Sheet 2 — `Pencairan`

| Kol | Header | Isi | Contoh |
|---|---|---|---|
| A | `ID_Pencairan` | Otomatis dari script (`PC-0001`, `PC-0002`, …) | `PC-0007` |
| B | `ID_Komponen` | **Relasi ke Sheet 1 kolom A** | `051.0M-522141` |
| C | `Tanggal_Cair` | `YYYY-MM-DD` | `2026-07-02` |
| D | `Nominal_Pencairan` | Angka murni | `3709999993` |
| E | `Keterangan` | Uraian singkat | `Sewa infrastruktur TI tahap II` |
| F | `Link_Dokumen_Bukti` | URL Google Drive / PDF | `https://drive.google.com/file/d/.../view` |
| G | `Dicatat_Pada` | Timestamp otomatis | — |

## A5. Deploy sebagai Web App

1. Di editor Apps Script: **Deploy → New deployment**.
2. Klik ikon gerigi → **Web app**.
3. Isi:
   - *Description*: `API Dashboard Anggaran v1`
   - **Execute as: `Me`** ← ini yang membuat spreadsheet **tetap privat**
   - **Who has access: `Anyone`** ← agar dashboard bisa membaca tanpa login
4. **Deploy** → **Authorize access** → **Allow**.
5. Copy **Web app URL**, bentuknya:
   `https://script.google.com/macros/s/AKfycb....../exec`

## A6. Uji endpoint

Tempel URL berikut di browser:

```
https://script.google.com/macros/s/AKfycb....../exec?action=getAll
```

Harus keluar JSON seperti ini (bukan halaman login):

```json
{
  "status": "ok",
  "updated": "2026-08-27T10:15:02+07:00",
  "anggaran": [
    { "ID_Komponen":"051.0M", "Tipe":"UTAMA", "Parent_ID":"",
      "Nama_Kegiatan":"Pengamanan dan Pemeliharaan TI",
      "Pagu_Anggaran":7445100000, "Total_Realisasi":7426699993,
      "Sisa_Anggaran":18400007, "Persen_Penyerapan":99.75 }
  ],
  "pencairan": [
    { "ID_Pencairan":"PC-0016", "ID_Komponen":"051.0M-522141",
      "Tanggal_Cair":"2026-07-02", "Nominal_Pencairan":3709999993,
      "Keterangan":"Sewa infrastruktur TI tahap II",
      "Link_Dokumen_Bukti":"https://drive.google.com/..." }
  ]
}
```

Endpoint lain yang tersedia:

| Endpoint | Fungsi |
|---|---|
| `?action=getAll` | Anggaran + Pencairan (dipakai dashboard) |
| `?action=getAnggaran` | Hanya Sheet 1 |
| `?action=getPencairan&komponen=051.0M-522141` | Riwayat 1 komponen |
| `POST {action:'addPencairan', token, ...}` | Tambah pencairan (dipakai Admin Panel) |
| `POST {action:'deletePencairan', token, ID_Pencairan}` | Hapus + hitung ulang |
| `POST {action:'recalc', token}` | Hitung ulang seluruh agregat |

| Fungsi | Kegunaan |
|---|---|
| `setupSpreadsheet` | Buat 2 sheet + header |
| `seedDataAwal` | Isi 32 baris pagu + 22 contoh pencairan |
| `seedPaguSaja` | Isi 32 baris pagu saja (produksi) |
| `recalcAll` | Hitung ulang seluruh agregat |
| `testGetAll` | Uji output API di Execution log |

> **Penting:** setiap kali `Code.gs` diubah, jalankan **Deploy → Manage deployments
> → Edit (pensil) → Version: New version → Deploy**. Tanpa itu, URL lama masih
> menyajikan kode versi lama.

---

# BAGIAN B — Deployment Frontend

## B1. Hubungkan ke API (satu file saja)

Buka `data-source.js`, ubah blok `CONFIG` di bagian paling atas:

```js
export const CONFIG = {
  MODE: 'appscript',                                   // ← dari 'seed'
  APPSCRIPT_URL: 'https://script.google.com/macros/s/AKfycb....../exec',
  ADMIN_TOKEN: 'TOKEN_YANG_SAMA_DENGAN_CODE_GS',       // ← wajib sama
  REFRESH_MS: 5 * 60 * 1000
};
```

Tiga mode yang tersedia:

| MODE | Baca | Tulis (admin) | Sheet privat | Kapan dipakai |
|---|---|---|---|---|
| `seed` | data contoh | simulasi | — | demo/offline, sebelum sheet siap |
| `appscript` | ✅ | ✅ | ✅ | **produksi** |
| `gviz` | ✅ | ❌ | ❌ (harus publik) | read-only cepat tanpa Apps Script |

Simpan, buka dashboard, dan pastikan badge **Sumber** di kanan atas berubah menjadi
*"Google Apps Script Web App"*.

## B2. Hosting gratis

Frontend sepenuhnya statis (HTML + JS, Chart.js via CDN). Tidak perlu Node/build.
Empat file yang harus diunggah bersama: kedua `.dc.html`, `data-source.js`, dan
`support.js`. Rename dashboard menjadi `index.html` bila ingin jadi halaman utama.

**Netlify (paling cepat, ± 1 menit)**
1. Buka https://app.netlify.com/drop
2. Tarik **folder** proyek (bukan file tunggal) ke halaman itu.
3. Dapat URL `https://nama-acak.netlify.app` → **Site settings → Change site name**.

**Vercel**
```bash
npm i -g vercel
cd folder-proyek
vercel          # Framework preset: Other
vercel --prod
```

**GitHub Pages** → lihat **Bagian B2-GH** di bawah untuk tutorial lengkap langkah demi langkah.

**Hosting instansi (cPanel / Nginx / IIS)**
Upload semua file ke `public_html` atau document root. **Wajib HTTPS** — panggilan
ke Apps Script akan diblokir browser bila halaman diakses lewat HTTP.

## B3. Checklist setelah deploy

- [ ] Dashboard tampil, KPI tidak nol, badge sumber = Apps Script
- [ ] Klik baris komponen utama → subkomponen mengembang
- [ ] Klik **Data Dukung** → modal muncul, tautan bukti terbuka di tab baru
- [ ] Panel Admin bisa dibuka dengan token, dropdown komponen terisi
- [ ] Uji simpan 1 pencairan → cek baris baru di Sheet `Pencairan` dan
      `Total_Realisasi` di Sheet `Anggaran` ikut berubah
- [ ] Buka di HP: kartu menumpuk rapi, tabel bisa di-scroll horizontal

---

# BAGIAN B2-GH — Tutorial Lengkap Hosting di GitHub Pages

Anda sudah selesai B1 (mengisi `CONFIG` di `data-source.js`). Sekarang unggah ke GitHub Pages.
Tersedia dua jalur — **pilih salah satu**:

- **Jalur 1 (tanpa terminal)** — upload lewat browser. Paling mudah, cocok bila belum pernah pakai Git.
- **Jalur 2 (terminal/Git)** — lebih cepat untuk update berkala.

## GH-0. ⚠ Baca ini dulu: keamanan token

GitHub Pages **selalu publik** (untuk akun gratis). Artinya siapa pun bisa membuka
`https://<user>.github.io/<repo>/data-source.js` dan **melihat isi `ADMIN_TOKEN` Anda**.
Konsekuensinya, orang tersebut bisa mengirim POST dan menulis ke spreadsheet.

Pilih satu penanganan sebelum melanjutkan:

| Opsi | Cara | Cocok untuk |
|---|---|---|
| **A.** | Unggah ke GitHub Pages **hanya dashboard publiknya** (tanpa `Admin Panel.dc.html`). Panel Admin dijalankan dari komputer operator atau Netlify berpassword. | Paling aman & gratis |
| **B.** | Repositori **Private** + GitHub Pages private — butuh GitHub Pro/Team/Enterprise | Instansi berlisensi |
| **C. ← dipakai di proyek ini** | Hosting penuh di Pages. **Token TIDAK lagi ditulis di kode** — `CONFIG.ADMIN_TOKEN` dibiarkan `''` dan admin mengetik token saat login (lihat GH-0b). | Umum, dengan pengerasan di bawah |

Daftar file yang **wajib** diunggah:

```
index.html                              ← pengalih ke dashboard (sudah disediakan)
Dashboard Penyerapan Anggaran.dc.html   ← dashboard publik
Admin Panel.dc.html                     ← panel admin (opsi C: ikut diunggah)
data-source.js                          ← konfigurasi + fallback data
support.js                              ← runtime (WAJIB, tanpa ini halaman kosong)
```

Yang **tidak perlu** diunggah: `Code.gs` (tempatnya di Apps Script),
`PANDUAN-INTEGRASI.md`, `Dashboard Penyerapan Anggaran v1.dc.html`, folder `uploads`.

## GH-0b. Pengerasan untuk Opsi C (wajib dibaca)

Karena seluruh sistem di-hosting publik, tiga hal berikut menggantikan proteksi hosting:

**1. Token tidak pernah masuk repositori.**
Di `data-source.js`, `ADMIN_TOKEN` sudah dibiarkan `''`. Admin mengetik tokennya di
halaman login Panel Admin; nilainya hanya hidup di `sessionStorage` tab tersebut dan
hilang saat tab ditutup atau saat klik **Keluar**. Yang tersimpan di GitHub hanya string
kosong — tidak ada rahasia yang bisa dibaca orang lain dari repo.
Validasi sesungguhnya dilakukan `Code.gs` saat POST: token salah → server menolak dan
form otomatis terkunci kembali.

**2. Token harus kuat.**
Ubah `ADMIN_TOKEN` di `Code.gs` menjadi acak dan panjang, mis. 32 karakter:

```js
var ADMIN_TOKEN = 'k7Qx2vB9pL4nR8sT1yU6wZ3aC5dF0gHj';
```

Hindari pola mudah diduga seperti `tu123456@` — dengan endpoint yang publik, token pendek
bisa ditebak. Setelah mengubah: **Deploy → Manage deployments → Edit → New version → Deploy**.
Tidak ada perubahan di frontend (token diketik, bukan disimpan).

**3. Batasi dampak bila token bocor.**

| Langkah | Cara |
|---|---|
| Spreadsheet tetap **privat** | Jangan share ke publik; Apps Script berjalan sebagai pemilik (`Execute as: Me`) |
| Endpoint tidak bisa menghapus data massal | Validasi `addPencairan` sudah menolak nominal > pagu; jangan bocorkan token ke selain operator |
| Jejak audit | Sheet **`Log`** merekam waktu, aksi, detail, dan email pelaku setiap POST — periksa berkala |
| Backup rutin | Spreadsheet → **File → Version history**, atau salin spreadsheet tiap akhir bulan |
| Rotasi token | Ganti nilai di `Code.gs` → New version → Deploy. Token lama langsung mati; beri tahu operator token baru |
| Keterangan tidak sensitif | Jangan tulis NIK, nomor rekening, atau data pribadi di kolom `Keterangan` |

**4. Sembunyikan halaman admin dari mesin pencari** (opsional).
Buat file `robots.txt` di root repo berisi:

```
User-agent: *
Disallow: /
```

Ini mencegah Panel Admin terindeks Google. Bukan pengaman, hanya mengurangi paparan.

---

## Jalur 1 — Tanpa Terminal (upload lewat browser)

### GH1-1. Siapkan folder di komputer
Buat folder baru, mis. `dashboard-anggaran`, lalu salin ke dalamnya **hanya** file
dari daftar wajib di atas. Pastikan semuanya **satu level** (tidak di dalam subfolder).

### GH1-2. Buat repositori
1. Login https://github.com → tombol **+** kanan atas → **New repository**.
2. *Repository name*: `dashboard-anggaran` (huruf kecil, tanpa spasi).
3. *Visibility*: **Public** (Pages gratis hanya untuk public).
4. **Jangan** centang "Add a README file".
5. **Create repository**.

### GH1-3. Upload file
1. Di halaman repo yang masih kosong, klik tautan **uploading an existing file**.
   (Atau **Add file → Upload files**.)
2. **Drag-and-drop semua file** dari folder tadi ke area upload — jangan folder-nya,
   tapi isinya. Tunggu semua nama file muncul di daftar.
3. Kolom *Commit changes*: tulis `deploy dashboard anggaran`.
4. Klik **Commit changes**.

### GH1-4. Aktifkan GitHub Pages
1. Di repo: tab **Settings** (kanan atas) → menu kiri **Pages**.
2. *Source*: pilih **Deploy from a branch**.
3. *Branch*: **`main`**, folder **`/ (root)`** → **Save**.
4. Tunggu 1–3 menit. Refresh halaman Settings → Pages; akan muncul kotak hijau:
   *"Your site is live at https://<user>.github.io/dashboard-anggaran/"*.
5. Buka URL tersebut. `index.html` akan mengalihkan otomatis ke dashboard.

### GH1-5. Update data/kode nanti
Buka repo → klik file yang ingin diubah (mis. `data-source.js`) → ikon **pensil** →
edit → **Commit changes**. Situs otomatis ter-deploy ulang dalam ±1 menit.
Untuk mengganti file dengan versi baru: **Add file → Upload files**, unggah file dengan
nama sama, commit — file lama tertimpa.

> Catatan: data anggaran **tidak** perlu di-upload ulang. Data hidup di Google Sheets;
> yang di GitHub hanya tampilan. Menambah pencairan cukup lewat Panel Admin.

---

## Jalur 2 — Dengan Terminal (Git)

Prasyarat: Git terpasang (`git --version` mengembalikan versi).

### GH2-1. Buat repo kosong di GitHub
Sama seperti GH1-2 (Public, tanpa README). Salin URL HTTPS-nya dari kotak
*Quick setup*, mis. `https://github.com/namaanda/dashboard-anggaran.git`.

### GH2-2. Inisialisasi & push

```bash
cd /path/ke/folder-proyek

# (sekali saja, bila belum pernah)
git config --global user.name  "Nama Anda"
git config --global user.email "email@anda.go.id"

# Cegah file yang tidak perlu ikut terunggah
cat > .gitignore <<'EOF'
uploads/
Code.gs
PANDUAN-INTEGRASI.md
Dashboard Penyerapan Anggaran v1.dc.html
EOF

git init
git add .
git commit -m "deploy dashboard penyerapan anggaran"
git branch -M main
git remote add origin https://github.com/namaanda/dashboard-anggaran.git
git push -u origin main
```

Saat diminta password, **bukan** password akun — gunakan **Personal Access Token**:
GitHub → foto profil → **Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate new token (classic)** → centang scope **`repo`** →
Generate → copy, lalu tempel sebagai password.

### GH2-3. Aktifkan Pages
Sama seperti GH1-4: **Settings → Pages → Deploy from a branch → main / (root) → Save**.

### GH2-4. Update berikutnya

```bash
git add .
git commit -m "perbarui konfigurasi"
git push
```

---

## GH-5. Verifikasi hasil deploy

Buka `https://<user>.github.io/<repo>/` dan periksa berurutan:

| # | Yang diperiksa | Bila gagal |
|---|---|---|
| 1 | Halaman tidak putih/kosong | `support.js` belum terunggah — lihat GH-6 |
| 2 | KPI menampilkan angka, badge sumber = *Google Apps Script Web App* | `CONFIG.MODE` masih `seed`, atau URL Apps Script salah |
| 3 | Grafik batang & donat muncul | Chart.js diblokir jaringan instansi — lihat GH-6 |
| 4 | Klik baris komponen utama → subkomponen mengembang | — |
| 5 | Klik **Data Dukung** → modal + tautan bukti terbuka | — |
| 6 | Buka di HP: kartu menumpuk, tabel scroll horizontal | — |
| 7 | Tekan **F12 → Console**: tidak ada error merah | catat pesannya, cocokkan di GH-6 |

Alamat situs Anda: `https://<username>.github.io/<nama-repo>/`
(perhatikan **garis miring di akhir** — tanpa itu bisa 404).

---

## GH-6. Troubleshooting GitHub Pages

| Gejala | Penyebab | Solusi |
|---|---|---|
| **404 Not Found** | Pages belum aktif, atau branch/folder salah | Settings → Pages → Source: `main` + `/ (root)`. Tunggu 3 menit. |
| **404** padahal Pages aktif | URL tanpa garis miring akhir, atau nama repo salah huruf | Pakai `.../nama-repo/` tepat sesuai penulisan repo |
| Halaman **putih kosong** | `support.js` tidak ikut terunggah | Cek daftar file di repo; unggah `support.js` ke root |
| Halaman kosong, Console: `Failed to load module ./data-source.js` | `data-source.js` tidak di folder yang sama | Letakkan sejajar dengan file `.dc.html`, bukan di subfolder |
| Tampil tapi **grafik tidak muncul** | CDN `cdn.jsdelivr.net` diblokir jaringan instansi | Unduh `chart.umd.js`, taruh di repo, ganti `src` di `<helmet>` menjadi `chart.umd.js` |
| **Banner merah** "Gagal memuat data" | URL Apps Script salah / deployment belum versi baru | Uji `...?action=getAll` di tab baru; Deploy → Manage deployments → New version |
| Data tampil tapi **angka lama** | Cache browser/CDN GitHub | Ctrl+Shift+R (hard refresh). Perubahan Pages butuh ±1–2 menit |
| Link **Panel Admin** 404 | File admin tidak ikut terunggah | Unggah `Admin Panel.dc.html` ke root repo |
| Login admin diterima tapi simpan gagal & form terkunci lagi | Token yang diketik tidak sama dengan `ADMIN_TOKEN` di `Code.gs` | Periksa token; pastikan deployment sudah **New version** setelah token diubah |
| Klik dashboard dari `index.html` gagal | Nama file dashboard diubah | Sesuaikan URL di `index.html` (spasi ditulis `%20`) |
| Commit sukses tapi situs tak berubah | Deploy gagal | Tab **Actions** di repo → lihat run terakhir; klik untuk pesan error |

## GH-7. Domain instansi (opsional)

1. Repo → **Settings → Pages → Custom domain** → isi mis. `anggaran.instansi.go.id` → **Save**.
2. Di pengelola DNS instansi, tambahkan record **CNAME**:
   `anggaran` → `<username>.github.io`
3. Tunggu propagasi DNS (bisa sampai 24 jam), lalu centang **Enforce HTTPS**.

## GH-8. Ringkasan alur kerja setelah live

```
Admin input pencairan  →  Panel Admin  →  POST  →  Google Sheets (Total_Realisasi auto-update)
                                                        │
Pimpinan buka URL Pages  →  Dashboard  ── GET ──────────┘   (auto-refresh tiap 5 menit)
```

GitHub hanya menyimpan tampilan. **Tidak ada deploy ulang saat data berubah** —
cukup edit Google Sheets atau input lewat Panel Admin.

---

## C1. Alur harian admin (jalur normal — via Panel Admin)

1. **Siapkan bukti.** Unggah SPM/SP2D/kuitansi ke folder Drive instansi
   (mis. `Bukti Pencairan 2026/Agustus`). Klik kanan file → **Share** →
   *Anyone with the link → Viewer* → **Copy link**.
2. Buka **Panel Admin** → masukkan token admin.
3. **Pilih komponen.** Selalu pilih **subkomponen** (baris menjorok), bukan
   komponen utama, agar rincian akurat. Kartu ringkasan akan menampilkan pagu,
   realisasi, dan sisa komponen tersebut.
4. Isi **Tanggal Cair** (tanggal SP2D), **Nominal** (angka saja — pemisah ribuan
   otomatis), **Keterangan** singkat, dan tempel **Link Dokumen Bukti**.
5. Klik **Simpan Pencairan**. Sistem menolak bila nominal melampaui sisa anggaran
   (validasi ganda: di browser dan di `Code.gs`).
6. Verifikasi di dashboard: buka modal **Data Dukung** komponen tersebut —
   entri baru harus muncul paling atas dengan tautan bukti aktif.

Frekuensi disarankan: **setiap kali SP2D terbit**, jangan menumpuk akhir bulan.

## C2. Jalur darurat (input langsung ke Google Sheets)

Dipakai bila Panel Admin tidak dapat diakses atau input massal (backlog).

1. Buka Sheet **`Pencairan`**, tambah baris di bawah data terakhir:
   - A `ID_Pencairan`: lanjutkan nomor terakhir (`PC-0023`, `PC-0024`, …)
   - B `ID_Komponen`: **copy tepat** dari Sheet `Anggaran` kolom A (jangan diketik ulang)
   - C `Tanggal_Cair`: `YYYY-MM-DD`
   - D `Nominal_Pencairan`: angka murni
   - E `Keterangan`, F `Link_Dokumen_Bukti`
2. **Wajib** setelah selesai: buka Apps Script → pilih fungsi **`recalcAll`** → **Run**.
   Ini menghitung ulang `Total_Realisasi` dan `Sisa_Anggaran` seluruh baris.
   Tanpa langkah ini, angka KPI di dashboard tidak ikut berubah.
3. Refresh dashboard (auto tiap 5 menit, atau klik **Muat Ulang**).

## C3. Perubahan pagu (revisi DIPA/POK)

1. Edit kolom `Pagu_Anggaran` pada Sheet `Anggaran` untuk baris **subkomponen**.
2. Sesuaikan pagu baris `UTAMA` bila perlu (dashboard menghitung induk dari jumlah anak).
3. Jalankan `recalcAll` agar `Sisa_Anggaran` diperbarui.
4. Catat nomor/tanggal revisi di kolom `Keterangan` sheet `Log` bila diperlukan audit.

## C4. Menambah komponen/subkomponen baru

Tambah baris di Sheet `Anggaran` dengan `ID_Komponen` unik, `Tipe` (`UTAMA`/`SUB`),
`Parent_ID` yang benar, dan `Pagu_Anggaran`. Dropdown di Panel Admin serta grafik
dashboard mengikuti otomatis — tidak ada kode yang perlu diubah.

## C5. Koreksi & pembatalan

- **Salah nominal/keterangan:** edit langsung baris di Sheet `Pencairan`, lalu `recalcAll`.
- **Batal cair:** hapus baris tersebut (atau kirim POST `deletePencairan`), lalu `recalcAll`.
- Riwayat perubahan via API tercatat di Sheet **`Log`** (waktu, aksi, detail, email pelaku).
- Backup: **File → Version history** pada spreadsheet, atau salin spreadsheet tiap
  akhir bulan (`DB Anggaran 2026 - Backup Agustus`).

## C6. Mengelola hak akses

Tiga lapis, sebaiknya dipakai bersama:

| Lapis | Cara | Menahan apa |
|---|---|---|
| **1. Token API** | `ADMIN_TOKEN` di `Code.gs`; frontend tidak menyimpannya (admin mengetik saat login). POST tanpa token yang benar ditolak. | Orang luar menulis ke sheet lewat endpoint |
| **2. Proteksi halaman admin** | Netlify: *Site settings → Access control → Password protection*. Cloudflare Access / Vercel Password juga bisa. Alternatif: taruh `Admin Panel.dc.html` di deployment terpisah yang di-password. | Orang luar membuka form admin |
| **3. Hak akses spreadsheet** | Sheet **tidak** dibagikan publik. Beri akses *Editor* hanya ke 1–2 operator, *Viewer* ke pimpinan. Dashboard tetap jalan karena Apps Script berjalan sebagai pemilik (`Execute as: Me`). | Perubahan data langsung oleh yang tidak berwenang |

Yang **tidak** boleh dilakukan:
- Menaruh token di repositori publik. Untuk GitHub publik, pakai lapis 2
  (password hosting) dan ganti token secara berkala.
- Memakai MODE `gviz` untuk data yang tidak boleh dibaca publik — mode itu
  mengharuskan sheet dibagikan ke siapa pun.

Rotasi token: ubah nilai di `Code.gs` → **Deploy → Manage deployments → New version**.
Token lama langsung mati; beri tahu operator token barunya. Tidak ada perubahan di
frontend karena token tidak tersimpan di kode.

> Gerbang token pada Panel Admin adalah lapis kenyamanan (menyembunyikan form),
> bukan pengaman kriptografis. Pengaman nyata = lapis 1 dan 2 di tabel atas.

---

# BAGIAN D — Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Badge sumber tetap "Data contoh" | `CONFIG.MODE` masih `seed` | Ubah ke `appscript` |
| Banner merah "Gagal memuat data" | URL salah / belum deploy versi baru | Uji `?action=getAll` di browser |
| Endpoint mengembalikan HTML login | *Who has access* bukan **Anyone** | Deploy ulang dengan akses Anyone |
| POST gagal: "Token tidak valid" | Token beda antara `Code.gs` dan `data-source.js` | Samakan, deploy ulang Web App |
| POST gagal CORS / `Failed to fetch` | Halaman diakses via HTTP, atau URL bukan `/exec` | Pakai HTTPS; pastikan URL berakhiran `/exec` |
| Nilai jadi 0 semua | Kolom E/F Sheet 1 bertipe teks | Format sebagai Number, hapus `Rp`/titik |
| Grafik kosong | Tidak ada baris `Tipe = UTAMA` | Isi kolom B dengan `UTAMA` pada baris induk |
| Subkomponen tidak muncul saat baris dibuka | `Parent_ID` tidak sama persis dengan `ID_Komponen` induk | Copy-paste kode induk, jangan diketik |
| Realisasi tidak berubah setelah input manual | `recalcAll` belum dijalankan | Apps Script → Run `recalcAll` |
| Error "Realisasi melampaui pagu" | Pagu belum direvisi di sheet | Perbaiki pagu, atau longgarkan validasi di `addPencairan()` |

---

# BAGIAN E — Kustomisasi cepat

| Yang diubah | Lokasi |
|---|---|
| Nama instansi / unit / satker | Panel **Tweaks** pada dashboard (`instansi`, `unit`, `satker`) |
| Mode gelap default | Tweaks → `defaultDark` |
| Ambang status Aman/Waspada | `AMANG`/`AMBANG` di `data-source.js` (`AMAN: 75`, `WASPADA: 25`) |
| Warna tema (navy/hijau/kuning/merah) | Blok `:root` & `[data-theme="dark"]` di `<helmet>` masing-masing halaman |
| Interval auto-refresh | `CONFIG.REFRESH_MS` |
| Logo instansi | Ganti kotak berlabel `IP` di header dengan `<img src="logo.png">` |
| Validasi over-budget (izinkan) | Fungsi `addPencairan()` di `Code.gs` — ubah `throw` menjadi log |
