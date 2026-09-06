const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getAllRak, createRak, updateRak, deleteRak } = require("../controllers/rakController");

const router = express.Router();
router.get("/", authMiddleware, getAllRak);
router.post("/", authMiddleware, roleMiddleware("admin"), createRak);
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateRak);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteRak);

module.exports = router;