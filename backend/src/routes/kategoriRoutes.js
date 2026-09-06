const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getAllKategori,
  getKategoriById,
  createKategori,
  updateKategori,
  deleteKategori,
} = require("../controllers/kategoriController");

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware("admin")];

router.get("/", authMiddleware, getAllKategori);
router.get("/:id", authMiddleware, getKategoriById);
router.post("/", ...adminOnly, createKategori);
router.put("/:id", ...adminOnly, updateKategori);
router.delete("/:id", ...adminOnly, deleteKategori);

module.exports = router;