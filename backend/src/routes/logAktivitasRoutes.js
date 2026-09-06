const express = require("express");

const { getAllLogs } = require("../controllers/logAktivitasController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("admin"), getAllLogs);

module.exports = router;