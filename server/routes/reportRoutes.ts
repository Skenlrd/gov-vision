import { Router, Request, Response } from "express"
import path from "path"
import fs from "fs"
import { generateReport, ReportConfig } from "../services/reportGenerator"
import Report from "../models/Report"
import ReportSchedule from "../models/ReportSchedule"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"

const router = Router()

router.post(
	"/generate",
	validateJWT,
	requireRole(["admin", "manager", "executive"]),
	async (req: Request, res: Response) => {
		try {
			const config: ReportConfig = {
				type: req.body.type || "executive_summary",
				format: req.body.format || "csv",
				dateFrom: req.body.dateFrom || "2026-01-01",
				dateTo: req.body.dateTo || new Date().toISOString().split("T")[0],
				departments: Array.isArray(req.body.departments) ? req.body.departments : [],
				requestedBy: req.user?.userId || "unknown",
			}

			const filePath = await generateReport(config)

			const reportRecord = await Report.create({
				type: config.type,
				format: config.format,
				status: "completed",
				filePath,
				parameters: config,
				generatedBy: config.requestedBy,
				generatedAt: new Date(),
			})

			return res.json({ reportId: reportRecord._id, status: "completed" })
		} catch (err: any) {
			console.error("[ReportAPI] Generation failed:", err.message)
			return res.status(500).json({ error: `Report generation failed: ${err.message}` })
		}
	}
)

router.get(
	"/",
	validateJWT,
	requireRole(["admin", "manager", "executive", "analyst"]),
	async (_req: Request, res: Response) => {
		try {
			const reports = await Report.find().sort({ generatedAt: -1 }).lean()
			return res.json(reports)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/:id/download",
	validateJWT,
	async (req: Request, res: Response) => {
		try {
			const report = await Report.findById(req.params.id)
			if (!report) {
				return res.status(404).json({ error: "Report not found" })
			}

			if (!fs.existsSync(report.filePath)) {
				return res.status(404).json({ error: "Report file not found on disk" })
			}

			const filename = path.basename(report.filePath)
			return res.download(report.filePath, filename)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.post(
	"/schedules",
	validateJWT,
	requireRole(["admin", "manager"]),
	async (req: Request, res: Response) => {
		try {
			const { name, reportConfig, frequency, recipients } = req.body

			const tomorrow = new Date()
			tomorrow.setDate(tomorrow.getDate() + 1)
			tomorrow.setHours(6, 0, 0, 0)

			const schedule = await ReportSchedule.create({
				name,
				reportConfig,
				frequency,
				nextRunAt: tomorrow,
				createdBy: req.user?.userId || "unknown",
				recipients: recipients || [],
			})

			return res.status(201).json(schedule)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/schedules",
	validateJWT,
	async (_req: Request, res: Response) => {
		try {
			const schedules = await ReportSchedule.find().sort({ createdAt: -1 }).lean()
			return res.json(schedules)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.patch(
	"/schedules/:id/toggle",
	validateJWT,
	requireRole(["admin", "manager"]),
	async (req: Request, res: Response) => {
		try {
			const schedule = await ReportSchedule.findById(req.params.id)
			if (!schedule) return res.status(404).json({ error: "Not found" })

			schedule.isActive = !schedule.isActive
			await schedule.save()
			return res.json(schedule)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.delete(
	"/schedules/:id",
	validateJWT,
	requireRole(["admin", "manager"]),
	async (req: Request, res: Response) => {
		try {
			await ReportSchedule.findByIdAndDelete(req.params.id)
			return res.json({ deleted: true })
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

export default router
