const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const pool = require("../config/database");
const { uploadDirectory } = require("../middleware/uploadMiddleware");
const logActivity = require("../services/activityLogService");

const documentSelect = `
  SELECT
    d.id,
    d.nomor_dokumen,
    d.qr_token,
    d.judul,
    d.seksi_id,
    s.nama_seksi,
    d.kategori_id,
    k.nama_kategori,
    d.rak_id,
    r.kode_rak,
    r.nama_rak,
    r.lokasi AS lokasi_rak,
    d.tanggal_dokumen,
    d.tahun,
    d.deskripsi,
    d.nama_file,
    d.file_path,
    d.tipe_file,
    d.ukuran_file,
    d.uploaded_by,
    u.nama AS nama_uploader,
    d.status,
    d.created_at,
    d.updated_at
  FROM dokumen d
  JOIN seksi s ON s.id = d.seksi_id
  JOIN kategori k ON k.id = d.kategori_id
  JOIN users u ON u.id = d.uploaded_by
  LEFT JOIN rak r ON r.id = d.rak_id
`;

const canAccessSection = (user, seksiId) =>
  user.role === "admin" || String(user.seksi_id) === String(seksiId);

const canViewDocument = () => true;

const removeUploadedFile = async (file) => {
  if (file) {
    await fs.unlink(file.path).catch(() => {});
  }
};

const getAllDokumen = async (req, res) => {
  try {
    const { seksi_id, kategori_id, tahun, tanggal_dokumen, status, search } =
      req.query;
    const values = [];
    const conditions = [];

    if (seksi_id) {
      values.push(seksi_id);
      conditions.push(`d.seksi_id = $${values.length}`);
    }

    if (kategori_id) {
      values.push(kategori_id);
      conditions.push(`d.kategori_id = $${values.length}`);
    }
    if (tahun) {
      values.push(tahun);
      conditions.push(`d.tahun = $${values.length}`);
    }
    if (tanggal_dokumen) {
      values.push(tanggal_dokumen);
      conditions.push(`d.tanggal_dokumen = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`d.status = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(d.nomor_dokumen ILIKE $${values.length} OR d.judul ILIKE $${values.length})`
      );
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `${documentSelect}${where} ORDER BY d.created_at DESC`,
      values
    );

    return res.status(200).json({
      success: true,
      message: "Data dokumen berhasil diambil",
      data: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data dokumen",
    });
  }
};

const getDokumenById = async (req, res) => {
  try {
    const result = await pool.query(
      `${documentSelect} WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dokumen tidak ditemukan",
      });
    }

    if (!canViewDocument(req.user, result.rows[0].seksi_id)) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke dokumen ini",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil dokumen",
    });
  }
};

const createDokumen = async (req, res) => {
  try {
    const {
      nomor_dokumen,
      judul,
      seksi_id: seksiId,
      kategori_id: kategoriId,
      tanggal_dokumen,
      tahun,
      deskripsi,
      rak_id: rakId,
    } = req.body;

    if (!req.file || !nomor_dokumen || !judul || !seksiId || !kategoriId) {
      await removeUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: "File, nomor dokumen, judul, seksi, dan kategori wajib diisi",
      });
    }

    if (!canAccessSection(req.user, seksiId)) {
      await removeUploadedFile(req.file);
      return res.status(403).json({
        success: false,
        message: "Staff hanya dapat mengupload dokumen ke seksinya",
      });
    }

    if (rakId) {
      const rack = await pool.query("SELECT id, seksi_id FROM rak WHERE id = $1", [rakId]);
      if (rack.rows.length === 0 || (rack.rows[0].seksi_id && String(rack.rows[0].seksi_id) !== String(seksiId))) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ success: false, message: "Rak tidak sesuai dengan seksi dokumen" });
      }
    }

    const category = await pool.query(
      "SELECT id FROM kategori WHERE id = $1 AND seksi_id = $2",
      [kategoriId, seksiId]
    );

    if (category.rows.length === 0) {
      await removeUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: "Kategori tidak sesuai dengan seksi yang dipilih",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO dokumen (
        nomor_dokumen, qr_token, judul, seksi_id, kategori_id, tanggal_dokumen,
        tahun, deskripsi, nama_file, file_path, tipe_file, ukuran_file,
        uploaded_by, status, rak_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'aktif', $14)
      RETURNING id
      `,
      [
        nomor_dokumen.trim(),
        crypto.randomBytes(32).toString("hex"),
        judul.trim(),
        seksiId,
        kategoriId,
        tanggal_dokumen || null,
        tahun || null,
        deskripsi || null,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.user.id,
        rakId || null,
      ]
    );
    await logActivity({
      userId: req.user.id,
      documentId: result.rows[0].id,
      activity: "UPLOAD_DOKUMEN",
      description: `Upload dokumen ${nomor_dokumen.trim()}`,
    });

    return res.status(201).json({
      success: true,
      message: "Dokumen berhasil diupload",
      data: { id: result.rows[0].id },
    });
  } catch (error) {
    await removeUploadedFile(req.file);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Nomor dokumen sudah digunakan",
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengupload dokumen",
    });
  }
};

const updateDokumen = async (req, res) => {
  try {
    const { seksi_id: seksiId, kategori_id: kategoriId, judul, deskripsi, rak_id: rakId } =
      req.body;
    const existing = await pool.query(
      "SELECT seksi_id FROM dokumen WHERE id = $1",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dokumen tidak ditemukan",
      });
    }

    if (!canAccessSection(req.user, existing.rows[0].seksi_id)) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke dokumen ini",
      });
    }

    const targetSection = seksiId || existing.rows[0].seksi_id;
    if (!canAccessSection(req.user, targetSection)) {
      return res.status(403).json({
        success: false,
        message: "Staff hanya dapat memindahkan dokumen di seksinya",
      });
    }

    if (rakId) {
      const rack = await pool.query("SELECT id, seksi_id FROM rak WHERE id = $1", [rakId]);
      if (rack.rows.length === 0 || (rack.rows[0].seksi_id && String(rack.rows[0].seksi_id) !== String(targetSection))) {
        return res.status(400).json({ success: false, message: "Rak tidak sesuai dengan seksi dokumen" });
      }
    }

    if (kategoriId) {
      const category = await pool.query(
        "SELECT id FROM kategori WHERE id = $1 AND seksi_id = $2",
        [kategoriId, targetSection]
      );
      if (category.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Kategori tidak sesuai dengan seksi yang dipilih",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE dokumen
      SET
        judul = COALESCE($1, judul),
        seksi_id = COALESCE($2, seksi_id),
        kategori_id = COALESCE($3, kategori_id),
        deskripsi = COALESCE($4, deskripsi),
        rak_id = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id
      `,
      [judul || null, seksiId || null, kategoriId || null, deskripsi, rakId || null, req.params.id]
    );
    await logActivity({
      userId: req.user.id,
      documentId: req.params.id,
      activity: "EDIT_DOKUMEN",
      description: "Metadata dokumen diperbarui",
    });

    return res.status(200).json({
      success: true,
      message: "Metadata dokumen berhasil diperbarui",
      data: { id: result.rows[0].id },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui metadata dokumen",
    });
  }
};

const archiveDokumen = async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE dokumen d
      SET status = 'arsip', updated_at = CURRENT_TIMESTAMP
      WHERE d.id = $1
        AND ($2 = 'admin' OR d.seksi_id = $3)
      RETURNING d.id
      `,
      [req.params.id, req.user.role, req.user.seksi_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dokumen tidak ditemukan atau tidak dapat diakses",
      });
    }
    await logActivity({
      userId: req.user.id,
      documentId: req.params.id,
      activity: "ARSIP_DOKUMEN",
      description: "Dokumen diarsipkan",
    });

    return res.status(200).json({
      success: true,
      message: "Dokumen berhasil diarsipkan",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengarsipkan dokumen",
    });
  }
};

const downloadDokumen = async (req, res) => {
  try {
    const result = await pool.query(
      `${documentSelect} WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dokumen tidak ditemukan",
      });
    }

    const document = result.rows[0];
    if (!canViewDocument(req.user, document.seksi_id)) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke dokumen ini",
      });
    }

    const filePath = path.join(uploadDirectory, path.basename(document.file_path));
    await fs.access(filePath);

    return res.download(filePath, document.nama_file, async (downloadError) => {
      if (!downloadError) {
        await logActivity({
          userId: req.user.id,
          documentId: document.id,
          activity: "DOWNLOAD_DOKUMEN",
          description: `Download ${document.nama_file}`,
        });
      }

      if (downloadError && !res.headersSent) {
        res.status(404).json({
          success: false,
          message: "File dokumen tidak ditemukan",
        });
      }
    });
  } catch (error) {
    console.error(error);

    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "File dokumen tidak ditemukan",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal mendownload dokumen",
    });
  }
};

const getPublicDokumenByQrToken = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.nomor_dokumen, d.judul, d.tanggal_dokumen, d.tahun,
        d.deskripsi, d.status, d.created_at, d.updated_at,
        s.nama_seksi, k.nama_kategori,
        r.kode_rak, r.nama_rak, r.lokasi AS lokasi_rak
      FROM dokumen d
      JOIN seksi s ON s.id = d.seksi_id
      JOIN kategori k ON k.id = d.kategori_id
      LEFT JOIN rak r ON r.id = d.rak_id
      WHERE d.qr_token = $1
    `, [req.params.token])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "QR dokumen tidak ditemukan" })
    }
    return res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: "Gagal membaca informasi QR dokumen" })
  }
};

module.exports = {
  getAllDokumen,
  getDokumenById,
  createDokumen,
  updateDokumen,
  archiveDokumen,
  downloadDokumen,
  getPublicDokumenByQrToken,
};