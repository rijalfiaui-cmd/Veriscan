# AbsenQR — Sistem Absensi Digital Berbasis QR Code

Aplikasi absensi siswa berbasis QR Code yang dapat diakses melalui browser HP Android.

## Deploy ke Netlify

Frontend berjalan di Netlify. Backend NestJS, PostgreSQL, dan penyimpanan foto
tetap berjalan di Railway (konfigurasi tersedia di `backend/railway.toml`).
Backend saat ini menyimpan foto ke disk, sehingga tidak dapat dipindahkan langsung
ke Netlify Functions tanpa perubahan penyimpanan dan entry point server.

1. Push repository ini ke GitHub.
2. Buat service Railway dari repository, dengan root directory `/backend` dan
   config file `/backend/railway.toml`. Tambahkan PostgreSQL dan set variabel backend:
   - `DATABASE_URL`: koneksi PostgreSQL dari service database.
   - `JWT_SECRET`: secret acak yang kuat (buat dengan `openssl rand -hex 32`).
   - `JWT_EXPIRES_IN`: `24h`.
   - `FRONTEND_URL`: origin situs Netlify, misalnya `https://nama-situs.netlify.app`.
   - `UPLOAD_DIR`: `/data/uploads`.
   Pasang volume persisten pada `/data`, lalu aktifkan public HTTPS domain backend.
   Railway menjalankan migrasi sebelum deployment; Prisma client dibuat sebelum build.
   Untuk database lama tanpa riwayat migrasi, ikuti bagian baseline di bawah terlebih dahulu.
3. Di Netlify, import repository tersebut. `netlify.toml` mengatur base directory
   `frontend`, build command `node scripts/netlify-build.mjs`, publish directory
   `dist` (relatif terhadap base), dan Node.js 22.
4. Tambahkan environment variable Netlify `RAILWAY_BACKEND_URL` dengan origin backend,
   misalnya `https://nama-api.up.railway.app`, tanpa `/api/v1`. Variabel ini harus
   tersedia saat build. Jangan masukkan `DATABASE_URL` atau `JWT_SECRET` ke frontend.
5. Deploy. Script build menggunakan `VITE_API_URL=/api/v1` dan menghasilkan proxy
   `/api/*` serta `/uploads/*` sebelum fallback React Router. Tidak perlu mengatur
   URL backend dalam source code. Jika URL backend berubah, deploy ulang frontend.
6. Pastikan `FRONTEND_URL` backend sesuai URL Netlify final. Periksa login, refresh
   halaman `/login`, scan kamera via HTTPS, serta upload dan tampilan foto.

`backend/prisma/seed.ts` menghapus data dan membuat akun dengan password demo.
Jangan jalankan seed pada database production yang sudah berisi data. Seed hanya
untuk database demo yang boleh dihapus; akun production perlu password unik dan
hash bcrypt pada tabel `staff`.

Verifikasi build lokal (URL contoh hanya untuk memeriksa build, bukan API aktif):

```bash
cd frontend
npm ci
RAILWAY_BACKEND_URL=https://nama-api.up.railway.app node scripts/netlify-build.mjs
```

Referensi: [Netlify redirects](https://docs.netlify.com/manage/routing/redirects/overview/),
[Railway pre-deploy](https://docs.railway.com/deployments/pre-deploy-command),
dan [Railway volumes](https://docs.railway.com/volumes).

## 🏗️ Struktur Project

```
MBG NEWGEN/
├── backend/     # NestJS + Prisma + PostgreSQL
└── frontend/    # React + Vite + TypeScript
```

---

## ⚙️ Prasyarat

- Node.js >= 18
- npm >= 9
- PostgreSQL (lokal atau cloud)
- DBeaver (opsional, untuk manajemen database)

---

## 🗄️ Setup Database (PostgreSQL)

### 1. Buat database

Buka DBeaver atau `psql` dan jalankan:

```sql
CREATE DATABASE mbg_attendance;
```

### 2. Konfigurasi koneksi

Salin dan edit file `.env`:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/mbg_attendance"
JWT_SECRET="ganti-dengan-secret-yang-aman"
JWT_EXPIRES_IN="24h"
PORT=3000
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
```

---

## 🚀 Setup Backend

```bash
cd backend

# Install dependencies (jika belum)
npm install

# Generate Prisma client
npx prisma generate

# Jalankan migration
npx prisma migrate dev --name init

# Seed data awal (akun petugas + siswa contoh)
npx prisma db seed

# Jalankan server development
npm run start:dev
```

Backend akan berjalan di: `http://localhost:3000`

---

## 🎨 Setup Frontend

```bash
cd frontend

# Install dependencies (jika belum)
npm install

# Konfigurasi .env
cp .env.example .env
# Edit VITE_API_URL jika backend bukan di localhost:3000

# Jalankan dev server
npm run dev
```

Frontend akan berjalan di: `http://localhost:5173`

---

## 👤 Akun Default (Seed Data)

| Role    | Username   | Password    |
|---------|------------|-------------|
| Petugas | petugas01  | petugas123  |
| Admin   | admin      | admin123    |

> **Penting:** Ganti password di production!

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Auth

| Method | Endpoint       | Auth | Deskripsi        |
|--------|---------------|------|------------------|
| POST   | /auth/login   | ❌   | Login petugas    |
| GET    | /auth/me      | ✅   | Info petugas login |

#### Contoh Login:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "petugas01", "password": "petugas123"}'
```

### Students

| Method | Endpoint              | Auth | Deskripsi             |
|--------|----------------------|------|-----------------------|
| GET    | /students            | ✅   | Daftar siswa (paged)  |
| POST   | /students            | ✅   | Tambah siswa baru     |
| GET    | /students/:id        | ✅   | Detail siswa          |
| PATCH  | /students/:id        | ✅   | Update data siswa     |
| POST   | /students/:id/photo  | ✅   | Upload foto siswa     |
| GET    | /students/:id/qr     | ✅   | Generate QR Code      |

#### Contoh Tambah Siswa:
```bash
curl -X POST http://localhost:3000/api/v1/students \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nisn": "0012345678",
    "name": "Nama Siswa",
    "schoolName": "SMA Negeri 1",
    "gender": "LAKI_LAKI",
    "foodRestrictions": null
  }'
```

### Attendance

| Method | Endpoint          | Auth | Deskripsi                |
|--------|------------------|------|--------------------------|
| POST   | /attendance/scan  | ✅   | Scan QR dan catat absensi |
| GET    | /attendance       | ✅   | Rekap absensi (filter)   |
| GET    | /attendance/:id   | ✅   | Detail satu record       |

#### Contoh Scan QR:
```bash
curl -X POST http://localhost:3000/api/v1/attendance/scan \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrToken": "uuid-token-dari-qr-siswa"}'
```

#### Query Rekap:
```
GET /attendance?date=2026-10-11&search=budi&page=1&limit=20
```

---

## 📱 Penggunaan di HP Android

1. Pastikan HP dan PC dalam jaringan WiFi yang sama
2. Jalankan backend dengan `npm run start:dev`
3. Jalankan frontend dengan `npm run dev -- --host`
4. Buka browser Android → ketik IP PC, misal: `http://192.168.1.10:5173`
5. Login dan mulai scan QR

> **Catatan:** Kamera QR hanya bisa diakses di HTTPS atau localhost. Untuk testing lokal lewat IP, gunakan mkcert atau ngrok untuk HTTPS.

---

## 🔐 Keamanan

- Password disimpan menggunakan **bcrypt** (cost factor 10)
- Autentikasi menggunakan **JWT** (expired 24 jam)
- QR Code hanya berisi token acak, bukan data pribadi
- Semua endpoint sensitif dilindungi JWT Guard
- CORS hanya mengizinkan origin frontend
- Pencegahan duplikasi absensi via DB unique constraint

---

## 🛠️ Perintah Berguna

```bash
# Backend
npx prisma studio           # Buka UI database
npx prisma migrate reset    # Reset database (hapus semua data!)
npx prisma db seed          # Seed ulang data
npm run start:dev           # Development dengan hot reload

# Frontend
npm run dev -- --host       # Expose ke jaringan lokal (untuk HP)
npm run build               # Build production
```

---

## 📂 File yang Dibuat/Dimodifikasi

### Backend (`backend/`)
- `prisma/schema.prisma` — Database schema (Student, Staff, Attendance)
- `prisma/seed.ts` — Data sintetis untuk testing
- `src/main.ts` — Entry point dengan CORS, prefix, static files
- `src/auth/` — JWT authentication module
- `src/students/` — Student CRUD + QR generation
- `src/attendance/` — Scan QR + rekap absensi
- `src/prisma/` — Prisma service

### Frontend (`frontend/`)
- `src/api/` — Axios API clients (auth, students, attendance)
- `src/context/AuthContext.tsx` — Auth state management
- `src/pages/LoginPage.tsx` — Halaman login
- `src/pages/ScanPage.tsx` — Halaman scan QR
- `src/pages/AttendancePage.tsx` — Halaman rekap absensi
- `src/components/StudentCard.tsx` — Komponen kartu siswa
- `src/components/BottomNav.tsx` — Navigasi bawah
- `src/index.css` — Design system global

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Kamera tidak muncul di HP | Gunakan HTTPS (ngrok/mkcert) atau akses via `localhost` |
| Koneksi ke backend gagal | Periksa FRONTEND_URL di `.env` backend dan `VITE_API_URL` di frontend |
| Migration gagal | Pastikan PostgreSQL berjalan dan `DATABASE_URL` benar |
| Seed gagal | Jalankan `npx prisma migrate reset` lalu `npx prisma db seed` |

## Penerima manfaat 3B-Lansia

Menu **Penerima Manfaat** menyediakan tab **Siswa** dan **3B-Lansia**. Kelompok
3B-Lansia memiliki nama, NIK unik 16 digit (disimpan sebagai teks), jalan, RT,
RW, kelurahan, kecamatan, kabupaten/kota, provinsi, kode pos 5 digit, pantangan
makanan, desil bilangan bulat 1–10, status aktif, dan foto opsional.

Kedua jenis penerima manfaat menggunakan pemindai QR dan rekap yang sama.
Rekap dapat difilter berdasarkan jenis penerima, tanggal, nama, NISN, atau NIK.
QR hanya berisi UUID acak. Setiap penerima hanya dapat dicatat sekali per hari
WIB; penerima nonaktif ditolak. Data dan QR siswa yang sudah ada tetap berlaku.

Pada form tambah maupun edit tersedia **Pilih Foto** dan **Ambil Foto**.
Kamera meminta izin browser, menampilkan pratinjau, lalu menyimpan gambar ketika
**Ambil Gambar** ditekan. Kamera memerlukan HTTPS atau localhost. Foto JPG, PNG,
dan WEBP dibatasi 5 MB; `UPLOAD_DIR` menentukan direktori penyimpanan. Foto gagal
unggah dapat dicoba kembali melalui form edit tanpa membuat data baru.

API baru (memerlukan JWT):

| Metode | Endpoint | Fungsi |
|---|---|---|
| GET / POST | `/api/v1/beneficiaries-3b` | Daftar dengan paginasi / tambah |
| GET / PATCH / DELETE | `/api/v1/beneficiaries-3b/:id` | Detail / edit / hapus beserta absensinya |
| GET | `/api/v1/beneficiaries-3b/:id/qr` | QR PNG dalam data URL |
| POST | `/api/v1/beneficiaries-3b/:id/photo` | Unggah multipart field `photo` |

Respons scan dan rekap menyertakan `recipient` dengan `type` (`STUDENT` atau
`THREE_B_ELDERLY`), `identifier`, nama, pantangan, foto, dan detail jenis penerima.
Field `student` dipertahankan untuk data siswa. Parameter rekap `type` menerima
`STUDENT` atau `THREE_B_ELDERLY`; tanpa parameter ini kedua jenis ditampilkan.

### Migrasi database tanpa reset

Tabel baru `beneficiaries_3b` terhubung ke `attendances.beneficiary3BId`.
`studentId` menjadi opsional; constraint database memastikan setiap absensi
memiliki tepat satu penerima, serta unik per penerima per hari.

Untuk database **baru/kosong**, dari direktori `backend`:

```bash
npm run db:deploy
npm run db:generate
```

Untuk instalasi **lama yang belum memiliki riwayat Prisma Migrate**, pastikan
skema awal sesuai dengan `prisma/migrations/0_init/migration.sql`, lalu tandai
baseline sebelum menerapkan migrasi tambahan:

```bash
npx prisma migrate resolve --applied 0_init
npm run db:deploy
npm run db:generate
```

Database lokal pada implementasi ini sudah melalui baseline dan migrasi tersebut.
Untuk deployment berikutnya cukup `npm run db:deploy` dan `npm run db:generate`.
Jangan menjalankan `migrate reset` atau seed untuk upgrade: seed lama menghapus
data aplikasi. Setelah upgrade, build/restart backend dan frontend bersama-sama.

### Pengujian integrasi

```bash
cd backend
npm run test:integration
```

Tes membuat skema PostgreSQL sementara pada server dari `DATABASE_URL`, menerapkan
migrasi, menguji API autentikasi, CRUD, validasi, foto, absensi kedua jenis,
duplikasi bersamaan, filter, waktu WIB, dan constraint database. Skema serta foto
tes dihapus setelah selesai; data aplikasi tidak diubah. Akun database untuk tes
memerlukan izin membuat dan menghapus skema sementara.
