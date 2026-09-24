const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { handleUpload } = require("../middleware/uploadMiddleware");
const {
  getAllDokumen,
  getTrashDokumen,
  getDokumenById,
  createDokumen,
  updateDokumen,
  archiveDokumen,
  moveDokumenToTrash,
  restoreDokumen,
  permanentDeleteDokumen,
  getDokumenVersions,
  createDocumentVersion,
  downloadDokumenVersion,
  downloadDokumen,
  getPublicDokumenByQrToken,
} = require("../controllers/dokumenController");

const router = express.Router();

router.get("/public/:token", getPublicDokumenByQrToken);
router.use(authMiddleware);
router.get("/trash", getTrashDokumen);
router.get("/", getAllDokumen);
router.get("/:id", getDokumenById);
router.post("/", handleUpload, createDokumen);
router.put("/:id", updateDokumen);
router.patch("/:id/archive", archiveDokumen);
router.delete("/:id", moveDokumenToTrash);
router.put("/:id/restore", restoreDokumen);
router.delete("/:id/permanent", permanentDeleteDokumen);
router.get("/:id/versions", getDokumenVersions);
router.post("/:id/version", handleUpload, createDocumentVersion);
router.get("/:id/versions/:versionId/download", downloadDokumenVersion);
router.get("/:id/download", downloadDokumen);

module.exports = router;