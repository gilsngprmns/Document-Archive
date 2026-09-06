const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { handleUpload } = require("../middleware/uploadMiddleware");
const {
  getAllDokumen,
  getDokumenById,
  createDokumen,
  updateDokumen,
  archiveDokumen,
  downloadDokumen,
  getPublicDokumenByQrToken,
} = require("../controllers/dokumenController");

const router = express.Router();

router.get("/public/:token", getPublicDokumenByQrToken);
router.use(authMiddleware);
router.get("/", getAllDokumen);
router.get("/:id", getDokumenById);
router.post("/", handleUpload, createDokumen);
router.put("/:id", updateDokumen);
router.patch("/:id/archive", archiveDokumen);
router.get("/:id/download", downloadDokumen);

module.exports = router;