const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getAllSeksi,
  getSeksiById,
  createSeksi,
  updateSeksi,
  deleteSeksi,
} = require("../controllers/seksiController");

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware("admin")];

router.get("/", authMiddleware, getAllSeksi);
router.get("/:id", authMiddleware, getSeksiById);
router.post("/", ...adminOnly, createSeksi);
router.put("/:id", ...adminOnly, updateSeksi);
router.delete("/:id", ...adminOnly, deleteSeksi);

module.exports = router;