const pool = require("../config/database");

const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 25);
    const values = [];
    const scope = req.user.role === "admin"
      ? ""
      : "WHERE (l.user_id = $1 OR d.seksi_id = $2)";

    if (req.user.role !== "admin") {
      values.push(req.user.id, req.user.seksi_id);
    }

    values.push(limit);
    const limitPlaceholder = `$${values.length}`;
    const result = await pool.query(
      `
      SELECT l.id, l.aktivitas, l.deskripsi, l.read_at, l.created_at,
             u.nama AS nama_user, d.judul AS judul_dokumen
      FROM log_aktivitas l
      LEFT JOIN users u ON u.id = l.user_id
      LEFT JOIN dokumen d ON d.id = l.dokumen_id
      ${scope}
      ORDER BY l.created_at DESC
      LIMIT ${limitPlaceholder}
      `,
      values,
    );

    const unreadScope = req.user.role === "admin"
      ? "WHERE l.read_at IS NULL"
      : `${scope} AND l.read_at IS NULL`;
    const unreadResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM log_aktivitas l LEFT JOIN dokumen d ON d.id = l.dokumen_id ${unreadScope}`,
      values.slice(0, -1),
    );

    return res.json({ success: true, data: result.rows, unread_count: unreadResult.rows[0].total });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Notifikasi belum dapat dimuat" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      await pool.query("UPDATE log_aktivitas SET read_at = CURRENT_TIMESTAMP WHERE read_at IS NULL");
    } else {
      await pool.query(
        "UPDATE log_aktivitas l SET read_at = CURRENT_TIMESTAMP FROM dokumen d WHERE l.read_at IS NULL AND (l.user_id = $1 OR d.seksi_id = $2) AND (l.dokumen_id IS NULL OR d.id = l.dokumen_id)",
        [req.user.id, req.user.seksi_id],
      );
    }
    return res.json({ success: true, message: "Notifikasi ditandai sudah dibaca" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Notifikasi belum dapat diperbarui" });
  }
};

module.exports = { getNotifications, markAllNotificationsRead };
