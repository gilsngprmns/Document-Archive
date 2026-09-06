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
  const documentsWithoutQr = await pool.query('SELECT id FROM dokumen WHERE qr_token IS NULL')
  for (const document of documentsWithoutQr.rows) {
    await pool.query('UPDATE dokumen SET qr_token = $1 WHERE id = $2', [crypto.randomBytes(32).toString('hex'), document.id])
  }

  await pool.query(
    'CREATE INDEX IF NOT EXISTS dokumen_rak_id_idx ON dokumen(rak_id)',
  )
}

module.exports = ensureRoles
