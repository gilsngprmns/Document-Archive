const pool = require("../config/database");

const getAllRak = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.kode_rak, r.nama_rak, r.lokasi, r.seksi_id,
        s.nama_seksi, COUNT(d.id)::int AS jumlah_dokumen
      FROM rak r
      LEFT JOIN seksi s ON s.id = r.seksi_id
      LEFT JOIN dokumen d ON d.rak_id = r.id
      GROUP BY r.id, s.nama_seksi
      ORDER BY r.kode_rak ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data rak" });
  }
};

const createRak = async (req, res) => {
  const { kode_rak, nama_rak, lokasi, seksi_id } = req.body;
  if (!kode_rak || !nama_rak) {
    return res.status(400).json({ success: false, message: "Kode dan nama rak wajib diisi" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rak (kode_rak, nama_rak, lokasi, seksi_id)
       VALUES ($1, $2, $3, $4) RETURNING id, kode_rak, nama_rak, lokasi, seksi_id`,
      [kode_rak.trim(), nama_rak.trim(), lokasi?.trim() || null, seksi_id || null]
    );
    return res.status(201).json({ success: true, message: "Rak berhasil ditambahkan", data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Kode rak sudah digunakan" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Gagal menambahkan rak" });
  }
};

const updateRak = async (req, res) => {
  const { kode_rak, nama_rak, lokasi, seksi_id } = req.body;
  if (!kode_rak || !nama_rak) {
    return res.status(400).json({ success: false, message: "Kode dan nama rak wajib diisi" });
  }
  try {
    const result = await pool.query(
      `UPDATE rak SET kode_rak = $1, nama_rak = $2, lokasi = $3, seksi_id = $4,
        updated_at = CURRENT_TIMESTAMP WHERE id = $5
       RETURNING id, kode_rak, nama_rak, lokasi, seksi_id`,
      [kode_rak.trim(), nama_rak.trim(), lokasi?.trim() || null, seksi_id || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: "Rak tidak ditemukan" });
    return res.json({ success: true, message: "Rak berhasil diperbarui", data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "Kode rak sudah digunakan" });
    console.error(error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui rak" });
  }
};

const deleteRak = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM rak r WHERE r.id = $1
       AND NOT EXISTS (SELECT 1 FROM dokumen d WHERE d.rak_id = r.id)
       RETURNING r.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(409).json({ success: false, message: "Rak tidak ditemukan atau masih dipakai dokumen" });
    return res.json({ success: true, message: "Rak berhasil dihapus" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Gagal menghapus rak" });
  }
};

module.exports = { getAllRak, createRak, updateRak, deleteRak };