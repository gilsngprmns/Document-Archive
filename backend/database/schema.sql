-- Sistem Pengarsipan Dokumen
-- Jalankan setelah membuat database Sistem_pengarsipan.
-- File fisik dokumen tetap berada di backend/uploads.

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nama_role VARCHAR(30) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seksi (
  id SERIAL PRIMARY KEY,
  nama_seksi VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,
  password TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  seksi_id INTEGER REFERENCES seksi(id) ON DELETE SET NULL,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kategori (
  id SERIAL PRIMARY KEY,
  seksi_id INTEGER NOT NULL REFERENCES seksi(id) ON DELETE RESTRICT,
  nama_kategori VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT kategori_seksi_nama_unique UNIQUE (seksi_id, nama_kategori)
);

CREATE TABLE IF NOT EXISTS rak (
  id SERIAL PRIMARY KEY,
  kode_rak VARCHAR(40) NOT NULL UNIQUE,
  nama_rak VARCHAR(120) NOT NULL,
  lokasi VARCHAR(180),
  seksi_id INTEGER REFERENCES seksi(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dokumen (
  id SERIAL PRIMARY KEY,
  nomor_dokumen VARCHAR(120) NOT NULL UNIQUE,
  qr_token VARCHAR(80) UNIQUE,
  judul VARCHAR(255) NOT NULL,
  seksi_id INTEGER NOT NULL REFERENCES seksi(id) ON DELETE RESTRICT,
  kategori_id INTEGER NOT NULL REFERENCES kategori(id) ON DELETE RESTRICT,
  rak_id INTEGER REFERENCES rak(id) ON DELETE SET NULL,
  tanggal_dokumen DATE,
  tahun INTEGER,
  deskripsi TEXT,
  nama_file VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  tipe_file VARCHAR(120) NOT NULL,
  ukuran_file BIGINT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dokumen_status_check CHECK (status IN ('aktif', 'arsip'))
);

CREATE TABLE IF NOT EXISTS log_aktivitas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  dokumen_id INTEGER REFERENCES dokumen(id) ON DELETE SET NULL,
  aktivitas VARCHAR(60) NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nama_role)
VALUES ('admin'), ('staff')
ON CONFLICT (nama_role) DO NOTHING;

INSERT INTO seksi (nama_seksi)
VALUES
  ('Pemerintahan'),
  ('Ekonomi Pembangunan'),
  ('Kesejahteraan Rakyat')
ON CONFLICT (nama_seksi) DO NOTHING;

INSERT INTO kategori (seksi_id, nama_kategori, deskripsi)
SELECT s.id, seed.nama_kategori, seed.deskripsi
FROM (
  VALUES
    ('Pemerintahan', 'Surat Masuk', 'Dokumen surat masuk pada Seksi Pemerintahan'),
    ('Pemerintahan', 'Surat Keluar', 'Dokumen surat keluar pada Seksi Pemerintahan'),
    ('Pemerintahan', 'Laporan', 'Dokumen laporan pada Seksi Pemerintahan'),
    ('Ekonomi Pembangunan', 'Surat Masuk', 'Dokumen surat masuk pada Seksi Ekonomi Pembangunan'),
    ('Ekonomi Pembangunan', 'Data Pembangunan', 'Dokumen dan data terkait pembangunan'),
    ('Ekonomi Pembangunan', 'Laporan Kegiatan', 'Dokumen laporan kegiatan Seksi Ekonomi Pembangunan'),
    ('Kesejahteraan Rakyat', 'Surat Masuk', 'Dokumen surat masuk pada Seksi Kesejahteraan Rakyat'),
    ('Kesejahteraan Rakyat', 'Data Bantuan', 'Dokumen terkait data bantuan masyarakat'),
    ('Kesejahteraan Rakyat', 'Laporan Kegiatan', 'Dokumen laporan kegiatan Seksi Kesejahteraan Rakyat')
) AS seed(nama_seksi, nama_kategori, deskripsi)
JOIN seksi s ON s.nama_seksi = seed.nama_seksi
ON CONFLICT (seksi_id, nama_kategori) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dokumen' AND column_name = 'rak_id') THEN
    ALTER TABLE dokumen ADD COLUMN rak_id INTEGER REFERENCES rak(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dokumen' AND column_name = 'qr_token') THEN
    ALTER TABLE dokumen ADD COLUMN qr_token VARCHAR(80) UNIQUE;
  END IF;
  UPDATE dokumen SET qr_token = md5(random()::text || clock_timestamp()::text || id::text)
  WHERE qr_token IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS dokumen_seksi_id_idx ON dokumen(seksi_id);
CREATE INDEX IF NOT EXISTS dokumen_kategori_id_idx ON dokumen(kategori_id);
CREATE INDEX IF NOT EXISTS dokumen_rak_id_idx ON dokumen(rak_id);
CREATE INDEX IF NOT EXISTS dokumen_status_idx ON dokumen(status);
CREATE INDEX IF NOT EXISTS log_aktivitas_created_at_idx ON log_aktivitas(created_at DESC);
