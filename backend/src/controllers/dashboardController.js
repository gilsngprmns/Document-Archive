const pool = require("../config/database");

const getDashboardStats = async (req, res) => {
  try {
    const values = [];
    const docConditions = [];

    if (req.user.role !== "admin") {
      values.push(req.user.seksi_id);
      docConditions.push(`d.seksi_id = $${values.length}`);
    }

    const summaryQuery = `
      SELECT
        COUNT(*) FILTER (WHERE d.deleted_at IS NULL) AS total_dokumen,
        COUNT(*) FILTER (WHERE d.deleted_at IS NOT NULL) AS trash,
        (SELECT COUNT(*) FROM users u WHERE u.status = TRUE) AS total_users,
        (SELECT COUNT(*) FROM kategori) AS total_kategori
      FROM dokumen d
      ${docConditions.length ? `WHERE ${docConditions.join(" AND ")}` : ""}
    `;

    const summaryResult = await pool.query(summaryQuery, values);

    const perSeksiQuery = `
      SELECT
        s.nama_seksi,
        COUNT(d.id)::int AS total_dokumen
      FROM seksi s
      LEFT JOIN dokumen d ON d.seksi_id = s.id AND d.deleted_at IS NULL
      ${req.user.role !== "admin" ? "WHERE s.id = $1" : ""}
      GROUP BY s.id, s.nama_seksi
      ORDER BY s.id ASC
    `;

    const perSeksiResult = await pool.query(
      perSeksiQuery,
      req.user.role !== "admin" ? [req.user.seksi_id] : []
    );

    const perBulanQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', d.created_at), 'Mon') AS bulan,
        COUNT(*)::int AS total_dokumen
      FROM dokumen d
      WHERE d.deleted_at IS NULL
      ${req.user.role !== "admin" ? "AND d.seksi_id = $1" : ""}
      GROUP BY DATE_TRUNC('month', d.created_at)
      ORDER BY DATE_TRUNC('month', d.created_at) ASC
      LIMIT 12
    `;

    const perBulanResult = await pool.query(
      perBulanQuery,
      req.user.role !== "admin" ? [req.user.seksi_id] : []
    );

    const topKategoriQuery = `
      SELECT
        k.nama_kategori,
        COUNT(d.id)::int AS total_dokumen
      FROM kategori k
      LEFT JOIN dokumen d ON d.kategori_id = k.id AND d.deleted_at IS NULL
      ${req.user.role !== "admin" ? "WHERE k.seksi_id = $1" : ""}
      GROUP BY k.id, k.nama_kategori
      ORDER BY COUNT(d.id) DESC, k.nama_kategori ASC
      LIMIT 5
    `;

    const topKategoriResult = await pool.query(
      topKategoriQuery,
      req.user.role !== "admin" ? [req.user.seksi_id] : []
    );

    const aktivitasQuery = `
      SELECT
        la.id,
        la.aktivitas,
        la.deskripsi,
        la.created_at,
        u.nama AS nama_user,
        d.judul AS dokumen_judul
      FROM log_aktivitas la
      LEFT JOIN users u ON u.id = la.user_id
      LEFT JOIN dokumen d ON d.id = la.dokumen_id
      WHERE 1 = 1
      ${req.user.role !== "admin" ? "AND (la.user_id = $1 OR d.seksi_id = $1 OR d.seksi_id IS NULL)" : ""}
      ORDER BY la.created_at DESC
      LIMIT 10
    `;

    const aktivitasResult = await pool.query(
      aktivitasQuery,
      req.user.role !== "admin" ? [req.user.seksi_id] : []
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total_dokumen: Number(summaryResult.rows[0]?.total_dokumen || 0),
          trash: Number(summaryResult.rows[0]?.trash || 0),
          total_users: Number(summaryResult.rows[0]?.total_users || 0),
          total_kategori: Number(summaryResult.rows[0]?.total_kategori || 0),
        },
        dokumen_per_seksi: perSeksiResult.rows,
        dokumen_per_bulan: perBulanResult.rows,
        top_kategori: topKategoriResult.rows,
        aktivitas_terbaru: aktivitasResult.rows,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik dashboard",
    });
  }
};

module.exports = { getDashboardStats };
