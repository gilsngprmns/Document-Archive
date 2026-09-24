const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { listRequests, createRequest, processRequest, completeRequest } = require("../controllers/documentRequestController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", listRequests);
router.post("/", createRequest);
router.patch("/:id/process", processRequest);
router.patch("/:id/complete", completeRequest);

module.exports = router;