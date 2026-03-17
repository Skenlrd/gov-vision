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

function mapStatus(
  taskType: string | undefined,
  completedAt: Date | null
): "approved" | "rejected" | "pending" {
  if (taskType === "Approval") return "approved"
  if (taskType === "Escalation") return "rejected"
  if (completedAt !== null) return "approved"
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomBetween(min: number, max: number, decimals = 2): number {
  const factor = 10 ** decimals
  const raw = Math.random() * (max - min) + min
  return Math.round(raw * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function deriveCycleTime(original: number): number {
  if (original < 2.5) return randomBetween(0.5, 8, 2)
  if (original < 4.5) return randomBetween(4, 24, 2)
  return randomBetween(20, 120, 2)
}

function deriveRejectionCount(original: number): number {
  if (original === 0) return randomBetween(0, 1.5, 1)
  if (original === 1) return randomBetween(1, 3.5, 1)
  if (original === 2) return randomBetween(2, 5.5, 1)
  return randomBetween(4, 8, 1)
}

function recalcDaysOverSLA(cycleTimeHours: number, revisionCount: number): number {
  const estimatedHours = revisionCount * 0.8
  return Math.max(0, Number(((cycleTimeHours - estimatedHours) / 24).toFixed(4)))
}

// Pure unsupervised distribution
// No labels or pre-selected anomalies are assigned.
// A random roll places each row into a realistic tier.
// The model then discovers unusual rows statistically.

function enrichOriginalDistribution(base: {
  cycleTimeHours: number
  rejectionCount: number
  revisionCount: number
  stageCount: number
}): {
  cycleTimeHours: number
  rejectionCount: number
  revisionCount: number
  stageCount: number
} {
  const roll = Math.random()

  let cycleTimeHours = base.cycleTimeHours
  let rejectionCount = base.rejectionCount
  let revisionCount = base.revisionCount
  let stageCount = base.stageCount

  if (roll < 0.82) {
    // 82% normal decisions with slight variation.
    cycleTimeHours = cycleTimeHours * randomBetween(0.9, 1.15, 3)
    rejectionCount = rejectionCount + randomBetween(0, 0.8, 1)
    revisionCount = revisionCount + randomBetween(0, 1.2, 1)
  } else if (roll < 0.94) {
    // 12% borderline decisions.
    cycleTimeHours = cycleTimeHours * randomBetween(1.2, 2.0, 3)
    rejectionCount = rejectionCount + randomBetween(0.8, 2.5, 1)
    revisionCount = revisionCount + randomBetween(1, 3.5, 1)
    stageCount = Math.max(stageCount, randomInt(2, 3))
  } else if (roll < 0.99) {
    // 5% elevated decisions.
    cycleTimeHours = cycleTimeHours * randomBetween(2.0, 3.8, 3)
    rejectionCount = rejectionCount + randomBetween(2, 5, 1)
    revisionCount = revisionCount + randomBetween(3, 7, 1)
    stageCount = 3
  } else {
    // 1% critical outliers.
    cycleTimeHours = randomBetween(60, 160, 2)
    rejectionCount = randomBetween(6, 12, 1)
    revisionCount = randomBetween(8, 16, 1)
    stageCount = 3
  }

  return {
    cycleTimeHours: clamp(Number(cycleTimeHours.toFixed(2)), 0.3, 200),
    rejectionCount: clamp(Number(rejectionCount.toFixed(1)), 0, 15),
    revisionCount: clamp(Number(revisionCount.toFixed(1)), 0, 20),
    stageCount: clamp(Math.round(stageCount), 1, 3)
  }
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

    const targetMinMs = Date.UTC(2025, 0, 1, 0, 0, 0, 0)
    const targetMaxMs = Date.UTC(2026, 2, 15, 23, 59, 59, 999)

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
      const departmentMeta = mapDepartmentMeta(row.Department)

      if (!departmentMeta) {
        unknownDepartmentCount += 1
      }

      const originalCycleTimeHours = actualMinutes / 60
      const originalRejectionCount = String(row.Delay_Flag ?? "").trim() === "1" ? randomOneToThree() : 0
      const baseRevisionCount = parseInt(String(row.Employee_Workload ?? "0"), 10) || 0
      const baseCycleTimeHours = deriveCycleTime(originalCycleTimeHours)
      const baseRejectionCount = deriveRejectionCount(originalRejectionCount)
      const baseStageCount = mapStageCount(row.Approval_Level)

      // Pure unsupervised enrichment.
      const enriched = enrichOriginalDistribution({
        cycleTimeHours: baseCycleTimeHours,
        rejectionCount: baseRejectionCount,
        revisionCount: baseRevisionCount,
        stageCount: baseStageCount
      })

      const cycleTimeHours = createdAt && completedAt
        ? parseFloat(
            (
              (completedAt.getTime() - createdAt.getTime())
              / 1000 / 3600
            ).toFixed(2)
          )
        : parseFloat((actualMinutes / 60).toFixed(2))
      const rejectionCount = enriched.rejectionCount
      const revisionCount = enriched.revisionCount
      const daysOverSLA = recalcDaysOverSLA(cycleTimeHours, revisionCount)

      docs.push({
        status: mapStatus(row.Task_Type, completedAt),
        departmentId: departmentMeta?.departmentId ?? null,
        departmentName: departmentMeta?.departmentName ?? null,
        createdAt,
        completedAt,
        cycleTimeHours,
        rejectionCount,
        revisionCount,
        daysOverSLA,
        stageCount: enriched.stageCount,
        hourOfDaySubmitted: createdAt ? createdAt.getHours() : null,
        priority: normalize(row.Priority_Level)
      })

      const prepared = i + 1
      if (prepared % 100 === 0) {
        console.log(`Prepared ${prepared} rows`)
      }
    }

    if (unknownDepartmentCount > 0) {
      console.warn(`Rows with unknown department: ${unknownDepartmentCount}`)
    }

    let insertedTotal = 0
    const batchSize = 100

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      const inserted = await m1Decision.insertMany(batch, { ordered: false })
      insertedTotal += inserted.length

      if (insertedTotal % 500 === 0 || insertedTotal === docs.length) {
        console.log(`Inserted ${insertedTotal} rows`)
      }
    }

    console.log(`\nTotal inserted: ${insertedTotal}`)
    console.log(`  python training/train_isolation_forest.py`)

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
