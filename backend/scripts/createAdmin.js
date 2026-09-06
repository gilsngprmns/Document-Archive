require("dotenv").config();

const bcrypt = require("bcryptjs");

const pool = require("../src/config/database");

const run = async () => {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("ADMIN_PASSWORD wajib dikonfigurasi saat menjalankan seed");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `
    INSERT INTO users (nama, username, email, password, role_id, seksi_id, status)
    SELECT $1, $2, $3, $4, r.id, NULL, $5
    FROM roles r
    WHERE r.nama_role = 'admin'
    ON CONFLICT (username) DO UPDATE SET
      nama = EXCLUDED.nama,
      email = EXCLUDED.email,
      password = EXCLUDED.password,
      role_id = EXCLUDED.role_id,
      seksi_id = EXCLUDED.seksi_id,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, username, email, status
    `,
    [
      process.env.ADMIN_NAME || "Administrator",
      process.env.ADMIN_USERNAME || "admin",
      process.env.ADMIN_EMAIL || "admin@localhost",
      passwordHash,
      true,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error("Role admin belum tersedia");
  }

  console.log(`Admin siap digunakan: ${result.rows[0].username}`);
};

run()
  .catch((error) => {
    console.error("Gagal membuat admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());