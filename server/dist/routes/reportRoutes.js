"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const reportGenerator_1 = require("../services/reportGenerator");
const Report_1 = __importDefault(require("../models/Report"));
const ReportSchedule_1 = __importDefault(require("../models/ReportSchedule"));
const validateJWT_1 = require("../middleware/validateJWT");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
router.post("/generate", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager", "executive", "analyst"]), async (req, res) => {
    try {
        const config = {
            type: req.body.type || "executive_summary",
            format: req.body.format || "csv",
            dateFrom: req.body.dateFrom || "2026-01-01",
            dateTo: req.body.dateTo || new Date().toISOString().split("T")[0],
            departments: Array.isArray(req.body.departments) ? req.body.departments : [],
            requestedBy: req.user?.userId || "unknown",
        };
        const filePath = await (0, reportGenerator_1.generateReport)(config);
        const reportRecord = await Report_1.default.create({
            type: config.type,
            format: config.format,
            status: "completed",
            filePath,
            parameters: config,
            generatedBy: config.requestedBy,
            generatedAt: new Date(),
        });
        return res.json({ reportId: reportRecord._id, status: "completed" });
    }
    catch (err) {
        console.error("[ReportAPI] Generation failed:", err.message);
        return res.status(500).json({ error: `Report generation failed: ${err.message}` });
    }
});
router.get("/", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager", "executive", "analyst"]), async (_req, res) => {
    try {
        const reports = await Report_1.default.find().sort({ generatedAt: -1 }).lean();
        return res.json(reports);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get("/:id/download", validateJWT_1.validateJWT, async (req, res) => {
    try {
        const report = await Report_1.default.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }
        if (!fs_1.default.existsSync(report.filePath)) {
            return res.status(404).json({ error: "Report file not found on disk" });
        }
        const filename = path_1.default.basename(report.filePath);
        return res.download(report.filePath, filename);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.post("/schedules", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager"]), async (req, res) => {
    try {
        const { name, reportConfig, frequency, recipients } = req.body;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0);
        const schedule = await ReportSchedule_1.default.create({
            name,
            reportConfig,
            frequency,
            nextRunAt: tomorrow,
            createdBy: req.user?.userId || "unknown",
            recipients: recipients || [],
        });
        return res.status(201).json(schedule);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get("/schedules", validateJWT_1.validateJWT, async (_req, res) => {
    try {
        const schedules = await ReportSchedule_1.default.find().sort({ createdAt: -1 }).lean();
        return res.json(schedules);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.patch("/schedules/:id/toggle", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager"]), async (req, res) => {
    try {
        const schedule = await ReportSchedule_1.default.findById(req.params.id);
        if (!schedule)
            return res.status(404).json({ error: "Not found" });
        schedule.isActive = !schedule.isActive;
        await schedule.save();
        return res.json(schedule);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.delete("/schedules/:id", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager"]), async (req, res) => {
    try {
        await ReportSchedule_1.default.findByIdAndDelete(req.params.id);
        return res.json({ deleted: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
