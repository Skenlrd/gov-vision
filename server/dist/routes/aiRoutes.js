"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateJWT_1 = require("../middleware/validateJWT");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
/*
  Stubs only — handlers filled in on Day 7
  when the Isolation Forest model is ready.
*/
router.get("/anomalies", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["manager", "admin", "executive"]), async (req, res) => {
    res.json({ message: "AI routes coming Day 7" });
});
router.put("/anomalies/:id/acknowledge", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["manager", "admin", "executive"]), async (req, res) => {
    res.json({ message: "AI routes coming Day 7" });
});
exports.default = router;
