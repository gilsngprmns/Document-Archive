# Setup database untuk komputer teman

## 1. Buat database PostgreSQL

Jalankan di `psql` atau Query Tool pgAdmin sebagai user PostgreSQL:

```sql
CREATE DATABASE Sistem_pengarsipan;
```

Jika database sudah ada, lewati langkah ini.

## 2. Import schema dan data awal

Dari folder `backend`:

```cmd
psql -U postgres -d Sistem_pengarsipan -f database\schema.sql
```

Script membuat tabel:

- `roles`
- `seksi`
- `users`
- `kategori`
- `dokumen`
- `log_aktivitas`

Data awal seksi, role `admin`/`staff`, dan kategori juga dibuat otomatis.

Jika database sudah pernah dibuat sebelumnya, jalankan migration request dokumen:

```cmd
psql -U postgres -d Sistem_pengarsipan -f database\migrations\003_add_document_requests.sql
```

## 3. Konfigurasi backend

Salin `.env.example` menjadi `.env`, kemudian isi password PostgreSQL:

```cmd
copy .env.example .env
```

Contoh nilai penting:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password_postgres
DB_NAME=Sistem_pengarsipan
JWT_SECRET=buat-secret-acak-yang-panjang
ADMIN_NAME=Administrator
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=Admin123!
```

Jangan ikutkan `.env` asli ketika mengirim zip.

## 4. Buat akun admin

```cmd
npm install
npm run seed:admin
```

Akun default sesuai contoh di atas:

```text
Username: admin
Password: Admin123!
```

## 5. Jalankan backend

```cmd
npm run dev
```

Backend berjalan di `http://localhost:5000`.

## Catatan file upload

PostgreSQL hanya menyimpan metadata dokumen. File PDF, gambar, dan dokumen fisik berada di:

```text
backend/uploads
```

Folder upload diabaikan oleh Git dan tidak masuk paket schema database. Jika ingin memindahkan dokumen yang sudah di-upload, copy folder `backend/uploads` secara terpisah bersama zip aplikasi.
