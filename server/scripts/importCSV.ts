import fs from "fs"
import path from "path"
import readline from "readline"
import dotenv from "dotenv"
import mongoose from "mongoose"

import m1Decision from "../models/m1Decisions"

dotenv.config()

const CSV_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "AI_Workflow_Optimization_Dataset_2500_Rows_v1.csv"
)

type CsvRow = Record<string, string>

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      const next = line[i + 1]

      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }

      continue
    }

    if (ch === "," && !inQuotes) {
      out.push(current)
      current = ""
      continue
    }

    current += ch
  }

  out.push(current)
  return out.map(v => v.trim())
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapStartTimeToTargetWindow(
  start: Date,
  sourceMinMs: number,
  sourceMaxMs: number,
  targetMinMs: number,
  targetMaxMs: number
): Date {
  if (sourceMaxMs <= sourceMinMs) {
    return new Date(targetMinMs)
  }

  const ratio = (start.getTime() - sourceMinMs) / (sourceMaxMs - sourceMinMs)
  const mappedMs = targetMinMs + ratio * (targetMaxMs - targetMinMs)

  return new Date(mappedMs)
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapStatus(taskType: string | undefined): "approved" | "rejected" | "pending" {
  if (taskType === "Approval") return "approved"
  if (taskType === "Escalation") return "rejected"
  return "pending"
}

function mapStageCount(level: string | undefined): number {
  if (level === "Level 1") return 1
  if (level === "Level 2") return 2
  if (level === "Level 3") return 3
  return 1
}

function randomOneToThree(): number {
  return Math.floor(Math.random() * 3) + 1
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

type DepartmentMeta = {
  departmentId: string
  departmentName: string
}

const DEPT_CANONICAL_META: Record<string, DepartmentMeta> = {
  "finance": {
    departmentId: "FI001",
    departmentName: "Finance"
  },
  "human resources": {
    departmentId: "HR002",
    departmentName: "Human Resources"
  },
  "operations": {
    departmentId: "OP003",
    departmentName: "Operations"
  },
  "information technology": {
    departmentId: "IT004",
    departmentName: "Information Technology"
  },
  "customer service": {
    departmentId: "CS005",
    departmentName: "Customer Service"
  }
}

const DEPT_ALIAS_TO_CANONICAL: Record<string, keyof typeof DEPT_CANONICAL_META> = {
  "finance": "finance",
  "fin": "finance",
  "financial": "finance",

  "hr": "human resources",
  "h r": "human resources",
  "h.r": "human resources",
  "h.r.": "human resources",
  "human resources": "human resources",
  "human resource": "human resources",

  "operations": "operations",
  "operation": "operations",
  "ops": "operations",

  "it": "information technology",
  "i t": "information technology",
  "i.t": "information technology",
  "i.t.": "information technology",
  "information technology": "information technology",
  "technology": "information technology",
  "tech": "information technology",

  "customer service": "customer service",
  "customer services": "customer service",
  "customer support": "customer service",
  "support": "customer service",
  "cs": "customer service"
}

function normalizeDepartmentKey(value: unknown): string {
  return normalize(value)
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function mapDepartmentMeta(value: unknown): DepartmentMeta | null {
  const normalizedKey = normalizeDepartmentKey(value)
  if (!normalizedKey) return null

  const canonical = DEPT_ALIAS_TO_CANONICAL[normalizedKey]
  if (!canonical) return null

  return DEPT_CANONICAL_META[canonical] ?? null
}

async function readCsvRows(filePath: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = []
  const stream = fs.createReadStream(filePath, { encoding: "utf8" })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let headers: string[] | null = null

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\uFEFF/g, "").trim()
    if (!line) continue

    if (!headers) {
      headers = splitCsvLine(line)
      continue
    }

    const values = splitCsvLine(line)
    const row: CsvRow = {}

    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? ""
    }

    rows.push(row)
  }

  return rows
}

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env")
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    const csvRows = await readCsvRows(CSV_PATH)
    console.log(`Parsed ${csvRows.length} CSV rows`)

    const sourceStartTimes = csvRows
      .map(row => parseDate(row.Task_Start_Time)?.getTime())
      .filter((t): t is number => typeof t === "number")

    if (sourceStartTimes.length === 0) {
      throw new Error("No valid timestamps found in CSV")
    }

    const sourceMinMs = Math.min(...sourceStartTimes)
    const sourceMaxMs = Math.max(...sourceStartTimes)

    const targetMinMs = new Date(2025, 0, 1, 0, 0, 0, 0).getTime()
    const targetMaxMs = new Date(2026, 2, 15, 0, 0, 0, 0).getTime()

    await m1Decision.deleteMany({})
    console.log("Cleared existing m1_decisions collection")

    const docs: Record<string, unknown>[] = []
    let unknownDepartmentCount = 0

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]

      const originalStart = parseDate(row.Task_Start_Time)
      const originalEnd = parseDate(row.Task_End_Time)

      const createdAt = originalStart
        ? mapStartTimeToTargetWindow(
            originalStart,
            sourceMinMs,
            sourceMaxMs,
            targetMinMs,
            targetMaxMs
          )
        : null

      const durationMs =
        originalStart && originalEnd
          ? originalEnd.getTime() - originalStart.getTime()
          : null

      const completedAt =
        createdAt && durationMs !== null
          ? new Date(createdAt.getTime() + durationMs)
          : null

      const actualMinutes = parseNumber(row.Actual_Time_Minutes)
      const estimatedMinutes = parseNumber(row.Estimated_Time_Minutes)

      const departmentMeta = mapDepartmentMeta(row.Department)

      if (!departmentMeta) {
        unknownDepartmentCount += 1
      }

      docs.push({
        status: mapStatus(row.Task_Type),
        department: departmentMeta?.departmentId ?? null,
        departmentId: departmentMeta?.departmentId ?? null,
        departmentName: departmentMeta?.departmentName ?? null,
        createdAt,
        completedAt,
        cycleTimeHours: actualMinutes / 60,
        rejectionCount: String(row.Delay_Flag ?? "").trim() === "1" ? randomOneToThree() : 0,
        revisionCount: parseInt(String(row.Employee_Workload ?? "0"), 10) || 0,
        daysOverSLA: Math.max(0, (actualMinutes - estimatedMinutes) / 60 / 24),
        stageCount: mapStageCount(row.Approval_Level),
        hourOfDaySubmitted: createdAt ? createdAt.getHours() : null,
        priority: normalize(row.Priority_Level)
      })

      const prepared = i + 1
      if (prepared % 100 === 0) {
        console.log(`Prepared ${prepared} rows`)
      }
    }

    if (unknownDepartmentCount > 0) {
      console.warn(`Rows with unknown department mapping: ${unknownDepartmentCount}`)
    }

    let insertedTotal = 0
    const batchSize = 100

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      const inserted = await m1Decision.insertMany(batch, { ordered: false })
      insertedTotal += inserted.length

      if (insertedTotal % 100 === 0 || insertedTotal === docs.length) {
        console.log(`Inserted ${insertedTotal} rows`)
      }
    }

    console.log(`Total inserted: ${insertedTotal}`)
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error("CSV import failed:", err)
    try {
      await mongoose.disconnect()
    } catch {
      // ignore disconnect issues
    }
    process.exit(1)
  }
}

main()
