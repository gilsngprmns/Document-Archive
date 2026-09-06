const bcrypt = require("bcryptjs");

const pool = require("../config/database");
const logActivity = require("../services/activityLogService");

const userSelect = `
  SELECT
    u.id,
    u.nama,
    u.username,
    u.email,
    u.seksi_id,
    u.status,
    u.created_at,
    u.updated_at,
    r.nama_role,
    s.nama_seksi
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN seksi s ON s.id = u.seksi_id
`;

const serializeUser = (user) => ({
  id: user.id,
  nama: user.nama,
  username: user.username,
  email: user.email,
  role: user.nama_role,
  seksi_id: user.seksi_id,
  nama_seksi: user.nama_seksi,
  status: user.status ? "aktif" : "nonaktif",
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const validateRoleAndSection = async (role, seksiId) => {
  if (!role || !["admin", "staff"].includes(role)) {
    return "Role harus berupa admin atau staff";
  }

  if (role === "staff" && !seksiId) {
    return "Staff wajib memiliki seksi";
  }

  if (role === "admin" && seksiId) {
    return "Admin tidak boleh memiliki seksi";
  }

  if (seksiId) {
    const section = await pool.query(
      "SELECT id FROM seksi WHERE id = $1",
      [seksiId]
    );

    if (section.rows.length === 0) {
      return "Seksi tidak ditemukan";
    }
  }

  return null;
};

const getRoleId = async (role) => {
  const result = await pool.query(
    "SELECT id FROM roles WHERE nama_role = $1",
    [role]
  );

  return result.rows[0] ? result.rows[0].id : null;
};

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`${userSelect} ORDER BY u.id ASC`);

    return res.status(200).json({
      success: true,
      message: "Data user berhasil diambil",
      data: result.rows.map(serializeUser),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data user",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      nama,
      username,
      email,
      password,
      role = "staff",
      seksi_id: seksiId = null,
    } = req.body;

    if (!nama || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, username, dan password wajib diisi",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter",
      });
    }

    const validationError = await validateRoleAndSection(role, seksiId);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(500).json({
        success: false,
        message: "Role belum tersedia di database",
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `
      INSERT INTO users (nama, username, email, password, role_id, seksi_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id
      `,
      [nama.trim(), username.trim(), email || null, passwordHash, roleId, seksiId]
    );

    const user = await pool.query(`${userSelect} WHERE u.id = $1`, [
      result.rows[0].id,
    ]);
    await logActivity({
      userId: req.user.id,
      activity: "CREATE_USER",
      description: `Membuat user ${username.trim()}`,
    });

    return res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
      data: serializeUser(user.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Username atau email sudah digunakan",
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat user",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama,
      username,
      email,
      role,
      seksi_id: seksiId = null,
    } = req.body;

    if (!nama || !username || !role) {
      return res.status(400).json({
        success: false,
        message: "Nama, username, dan role wajib diisi",
      });
    }

    const validationError = await validateRoleAndSection(role, seksiId);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(500).json({
        success: false,
        message: "Role belum tersedia di database",
      });
    }
    const result = await pool.query(
      `
      UPDATE users
      SET
        nama = $1,
        username = $2,
        email = $3,
        role_id = $4,
        seksi_id = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id
      `,
      [nama.trim(), username.trim(), email || null, roleId, seksiId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const user = await pool.query(`${userSelect} WHERE u.id = $1`, [id]);
    await logActivity({
      userId: req.user.id,
      activity: "UPDATE_USER",
      description: `Memperbarui user ${id}`,
    });
    return res.status(200).json({
      success: true,
      message: "User berhasil diperbarui",
      data: serializeUser(user.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Username atau email sudah digunakan",
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui user",
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (![true, false, "aktif", "nonaktif"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status harus aktif atau nonaktif",
      });
    }

    const isActive = status === true || status === "aktif";
    const result = await pool.query(
      `
      UPDATE users
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
      `,
      [isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }
    await logActivity({
      userId: req.user.id,
      activity: "UPDATE_USER",
      description: `Mengubah status user ${id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Status user berhasil diperbarui",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui status user",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 8 karakter",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `
      UPDATE users
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
      `,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }
    await logActivity({
      userId: req.user.id,
      activity: "UPDATE_USER",
      description: `Mereset password user ${id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Password user berhasil direset",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal mereset password user",
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateStatus,
  resetPassword,
};