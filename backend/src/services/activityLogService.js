const pool = require("../config/database");

const logActivity = async ({
  userId,
  documentId = null,
  requestId = null,
  activity,
  description,
}) => {
  try {
    await pool.query(
      `
      INSERT INTO log_aktivitas (user_id, dokumen_id, request_id, aktivitas, deskripsi)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [userId, documentId, requestId, activity, description || null]
    );
  } catch (error) {
    console.error("Gagal mencatat aktivitas:", error.message);
  }
};

module.exports = logActivity;