const pool = require('./database')
const crypto = require('crypto')

const ensureRoles = async () => {
  await pool.query(
    `INSERT INTO roles (nama_role)
     SELECT $1::text
     WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nama_role = $1::text)`,
    ['admin'],
  )
  await pool.query(
    `INSERT INTO roles (nama_role)
     SELECT $1::text
     WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nama_role = $1::text)`,
    ['staff'],
  )

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rak (
      id SERIAL PRIMARY KEY,
      kode_rak VARCHAR(40) NOT NULL UNIQUE,
      nama_rak VARCHAR(120) NOT NULL,
      lokasi VARCHAR(180),
      seksi_id INTEGER REFERENCES seksi(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    ALTER TABLE dokumen
    ADD COLUMN IF NOT EXISTS rak_id INTEGER REFERENCES rak(id) ON DELETE SET NULL
  `)

  await pool.query('ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS qr_token VARCHAR(80)')
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS dokumen_qr_token_idx ON dokumen(qr_token)')

  await pool.query('ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL')
  await pool.query('ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL')
  await pool.query('ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL')
  await pool.query('ALTER TABLE log_aktivitas ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL')

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'dokumen' AND constraint_name = 'dokumen_deleted_by_fkey'
      ) THEN
        ALTER TABLE dokumen
          ADD CONSTRAINT dokumen_deleted_by_fkey
          FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `)

  await pool.query(`
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
    )
  `)

  await pool.query('CREATE INDEX IF NOT EXISTS dokumen_versions_dokumen_id_idx ON dokumen_versions(dokumen_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS dokumen_versions_created_at_idx ON dokumen_versions(created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS dokumen_deleted_at_idx ON dokumen(deleted_at)')
  await pool.query('CREATE INDEX IF NOT EXISTS dokumen_deleted_by_idx ON dokumen(deleted_by)')

  const documentsWithoutQr = await pool.query('SELECT id FROM dokumen WHERE qr_token IS NULL')
  for (const document of documentsWithoutQr.rows) {
    await pool.query('UPDATE dokumen SET qr_token = $1 WHERE id = $2', [crypto.randomBytes(32).toString('hex'), document.id])
  }

  await pool.query(
    'CREATE INDEX IF NOT EXISTS dokumen_rak_id_idx ON dokumen(rak_id)',
  )
}

module.exports = ensureRoles
