const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const dokumenRoutes = require("./routes/dokumenRoutes");
const userRoutes = require("./routes/userRoutes");
const seksiRoutes = require("./routes/seksiRoutes");
const kategoriRoutes = require("./routes/kategoriRoutes");
const logAktivitasRoutes = require("./routes/logAktivitasRoutes");
const rakRoutes = require("./routes/rakRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Sistem Pengarsipan Dokumen berjalan",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dokumen", dokumenRoutes);
app.use("/api/users", userRoutes);
app.use("/api/seksi", seksiRoutes);
app.use("/api/kategori", kategoriRoutes);
app.use("/api/log-aktivitas", logAktivitasRoutes);
app.use("/api/rak", rakRoutes);

// Route tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

module.exports = app;