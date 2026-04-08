"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Anomaly_1 = __importDefault(require("../models/Anomaly"));
const cacheService_1 = require("../services/cacheService");
const router = (0, express_1.Router)();
router.get("/anomalies", 
// validateJWT, // TEMP: commented for development testing
// requireRole(["admin", "manager", "executive", "analyst"]), // TEMP: commented for development testing
async (req, res) => {
    try {
        const cacheKey = "m3:anomalies:active";
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const anomalies = await Anomaly_1.default.find({ isAcknowledged: false })
                .sort({ anomalyScore: -1 })
                .lean();
            const grouped = {
                Critical: [],
                High: [],
                Medium: [],
                Low: []
            };
            for (const anomaly of anomalies) {
                if (grouped[anomaly.severity]) {
                    grouped[anomaly.severity].push(anomaly);
                }
            }
            return {
                ...grouped,
                total: anomalies.length
            };
        });
        return res.json(data);
    }
    catch (err) {
        console.error("[GET /api/ai/anomalies]", err.message);
        return res.status(500).json({ error: "Failed to fetch anomalies" });
    }
});
router.put("/anomalies/:id/acknowledge", 
// validateJWT, // TEMP: commented for development testing
// requireRole(["admin", "manager", "executive"]), // TEMP: commented for development testing
async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updated = await Anomaly_1.default.findByIdAndUpdate(id, {
            $set: {
                isAcknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date()
            }
        }, { new: true });
        if (!updated) {
            return res.status(404).json({ error: "Anomaly not found" });
        }
        await (0, cacheService_1.invalidate)("m3:anomalies:active");
        return res.json(updated);
    }
    catch (err) {
        console.error("[PUT /api/ai/anomalies/:id/acknowledge]", err.message);
        return res.status(500).json({ error: "Failed to acknowledge anomaly" });
    }
});
exports.default = router;
