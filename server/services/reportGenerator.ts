import ExcelJS from "exceljs"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { parse as csvParse } from "json2csv"
import path from "path"
import fs from "fs/promises"
import { assembleReportData, ReportData } from "../utils/reportHelpers"

export type ReportFormat = "csv" | "excel" | "pdf"
export type ReportType = "executive_summary" | "compliance" | "anomaly" | "risk"

export interface ReportConfig {
	type: ReportType
	format: ReportFormat
	dateFrom: string
	dateTo: string
	departments: string[]
	requestedBy: string
}

const OUTPUT_DIR = path.join(__dirname, "..", "generated_reports")

export async function generateReport(config: ReportConfig): Promise<string> {
	await fs.mkdir(OUTPUT_DIR, { recursive: true })

	const data = await assembleReportData({
		dateFrom: config.dateFrom,
		dateTo: config.dateTo,
		departments: config.departments,
	})

	const timestamp = Date.now()
	const safeType = config.type.replace("_", "-")
	const baseFilename = `report-${safeType}-${timestamp}`

	if (config.format === "csv") {
		return generateCSV(data, baseFilename)
	}

	if (config.format === "excel") {
		return generateExcel(data, baseFilename)
	}

	return generatePDF(data, baseFilename, config)
}

async function generateCSV(data: ReportData, baseFilename: string): Promise<string> {
	const csv = csvParse(data.kpiRows, {
		fields: [
			{ label: "Department", value: "dept" },
			{ label: "Approval Rate %", value: "approvalRate" },
			{ label: "Avg Cycle Time (hours)", value: "avgCycleTime" },
			{ label: "Risk Level", value: "riskLevel" },
			{ label: "Compliance Rate %", value: "complianceRate" },
			{ label: "Total Decisions", value: "totalDecisions" },
			{ label: "Anomaly Count", value: "anomalyCount" },
		],
	})

	const filePath = path.join(OUTPUT_DIR, `${baseFilename}.csv`)
	await fs.writeFile(filePath, csv, "utf8")
	console.log(`[ReportGenerator] CSV saved: ${filePath}`)
	return filePath
}

async function generateExcel(data: ReportData, baseFilename: string): Promise<string> {
	const workbook = new ExcelJS.Workbook()
	workbook.creator = "GovVision"
	workbook.created = new Date()

	const kpiSheet = workbook.addWorksheet("KPI Summary")

	kpiSheet.columns = [
		{ header: "Department", key: "dept", width: 22 },
		{ header: "Approval Rate %", key: "approvalRate", width: 18 },
		{ header: "Avg Cycle Time (h)", key: "avgCycleTime", width: 20 },
		{ header: "Risk Level", key: "riskLevel", width: 14 },
		{ header: "Compliance Rate %", key: "complianceRate", width: 20 },
		{ header: "Total Decisions", key: "totalDecisions", width: 18 },
		{ header: "Anomaly Count", key: "anomalyCount", width: 16 },
	]

	const kpiHeaderRow = kpiSheet.getRow(1)
	kpiHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
	kpiHeaderRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF1F3A6E" },
	}
	kpiHeaderRow.height = 22

	data.kpiRows.forEach((row, index) => {
		const dataRow = kpiSheet.addRow(row)
		if (index % 2 === 0) {
			dataRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFEAF1FB" },
			}
		}

		const riskCell = dataRow.getCell("riskLevel")
		const riskColors: Record<string, string> = {
			Low: "FFD6EAD8",
			Medium: "FFFFF3CD",
			High: "FFFFE0B2",
			Critical: "FFFFEBEE",
		}
		const colorKey = String(row.riskLevel)
		if (riskColors[colorKey]) {
			riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: riskColors[colorKey] } }
		}
	})

	const anomalySheet = workbook.addWorksheet("Anomaly List")
	anomalySheet.columns = [
		{ header: "Decision ID", key: "decisionId", width: 28 },
		{ header: "Severity", key: "severity", width: 12 },
		{ header: "Anomaly Score", key: "anomalyScore", width: 15 },
		{ header: "Department", key: "department", width: 20 },
		{ header: "Acknowledged", key: "isAcknowledged", width: 14 },
		{ header: "Description", key: "description", width: 50 },
	]

	const anomalyHeaderRow = anomalySheet.getRow(1)
	anomalyHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
	anomalyHeaderRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF1F3A6E" },
	}
	anomalyHeaderRow.height = 22

	data.anomalyRows.forEach((row, index) => {
		const dataRow = anomalySheet.addRow(row)
		if (index % 2 === 0) {
			dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FF" } }
		}
	})

	const filePath = path.join(OUTPUT_DIR, `${baseFilename}.xlsx`)
	await workbook.xlsx.writeFile(filePath)
	console.log(`[ReportGenerator] Excel saved: ${filePath}`)
	return filePath
}

async function generatePDF(
	data: ReportData,
	baseFilename: string,
	config: ReportConfig
): Promise<string> {
	const doc = new jsPDF("p", "mm", "a4")

	doc.setFillColor(31, 58, 110)
	doc.rect(0, 0, 210, 40, "F")
	doc.setFontSize(20)
	doc.setTextColor(255, 255, 255)
	doc.text("GovVision", 14, 18)
	doc.setFontSize(13)
	doc.text("Governance Analytics Report", 14, 28)

	doc.setTextColor(60, 60, 60)
	doc.setFontSize(10)
	const metaY = 50
	doc.text(`Report Type: ${config.type.replace("_", " ").toUpperCase()}`, 14, metaY)
	doc.text(`Date Range: ${config.dateFrom} to ${config.dateTo}`, 14, metaY + 7)
	doc.text(
		`Departments: ${config.departments.length > 0 ? config.departments.join(", ") : "All"}`,
		14,
		metaY + 14
	)
	doc.text(`Generated: ${new Date().toLocaleString()}`, 14, metaY + 21)

	doc.setFontSize(12)
	doc.setTextColor(31, 58, 110)
	doc.text("KPI Summary by Department", 14, metaY + 34)

	autoTable(doc, {
		startY: metaY + 38,
		head: [["Department", "Approval Rate %", "Avg Cycle Time (h)", "Risk Level", "Compliance %"]],
		body: data.kpiRows.map((row) => [
			row.dept,
			row.approvalRate.toFixed(1),
			row.avgCycleTime.toFixed(1),
			row.riskLevel,
			row.complianceRate.toFixed(1),
		]),
		headStyles: {
			fillColor: [31, 58, 110],
			textColor: [255, 255, 255],
			fontSize: 9,
		},
		alternateRowStyles: {
			fillColor: [234, 241, 251],
		},
		styles: { fontSize: 9 },
		columnStyles: {
			3: { fontStyle: "bold" },
		},
	})

	const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 180
	if (finalY < 230 && data.anomalyRows.length > 0) {
		doc.setFontSize(12)
		doc.setTextColor(31, 58, 110)
		doc.text("Anomaly Summary", 14, finalY + 12)

		autoTable(doc, {
			startY: finalY + 16,
			head: [["Decision ID", "Severity", "Score", "Department", "Acknowledged"]],
			body: data.anomalyRows.slice(0, 10).map((row) => [
				row.decisionId.length > 20 ? `${row.decisionId.substring(0, 20)}...` : row.decisionId,
				row.severity,
				row.anomalyScore,
				row.department,
				row.isAcknowledged,
			]),
			headStyles: { fillColor: [31, 58, 110], textColor: [255, 255, 255], fontSize: 9 },
			styles: { fontSize: 8 },
		})
	}

	doc.setFontSize(8)
	doc.setTextColor(150, 150, 150)
	doc.text(
		"GovVision - Analytics & Reporting",
		14,
		doc.internal.pageSize.height - 8
	)

	const filePath = path.join(OUTPUT_DIR, `${baseFilename}.pdf`)
	const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
	await fs.writeFile(filePath, pdfBuffer)
	console.log(`[ReportGenerator] PDF saved: ${filePath}`)
	return filePath
}
