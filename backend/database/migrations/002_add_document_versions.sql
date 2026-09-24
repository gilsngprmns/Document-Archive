CREATE TABLE IF NOT EXISTS dokumen_versions (
  id SERIAL PRIMARY KEY,
  dokumen_id INTEGER NOT NULL REFERENCES dokumen(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  nama_file VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  tipe_file VARCHAR(100),
  ukuran_file BIGINT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  catatan_perubahan TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dokumen_id, version_number)
);

CREATE INDEX IF NOT EXISTS dokumen_versions_dokumen_id_idx ON dokumen_versions(dokumen_id);
CREATE INDEX IF NOT EXISTS dokumen_versions_created_at_idx ON dokumen_versions(created_at DESC);
