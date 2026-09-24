const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getNotifications, markAllNotificationsRead } = require("../controllers/notificationController");

const router = express.Router();
router.get("/", authMiddleware, getNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);

module.exports = router;
