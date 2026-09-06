const express = require("express");

const {
  getAllUsers,
  createUser,
  updateUser,
  updateStatus,
  resetPassword,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware("admin")];

router.get("/", ...adminOnly, getAllUsers);
router.post("/", ...adminOnly, createUser);
router.put("/:id", ...adminOnly, updateUser);
router.patch("/:id/status", ...adminOnly, updateStatus);
router.patch("/:id/password", ...adminOnly, resetPassword);

module.exports = router;