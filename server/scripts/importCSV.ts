import fs from "fs"
import path from "path"
import readline from "readline"
import dotenv from "dotenv"
import mongoose from "mongoose"

import m1Decision from "../models/m1Decisions"
import Anomaly from "../models/Anomaly"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const CSV_PATH = path.resolve(
  __dirname,
  "../Dataset",
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
  // FIX: Check completedAt first - if null, decision is still pending
  if (completedAt === null) return "pending"
  if (taskType === "Approval") return "approved"
  if (taskType === "Escalation") return "rejected"
  return "approved"
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
  // Center around 43h to match BPI model's 12x scaled distribution
  const base = randomBetween(20, 60, 2)
  if (original < 2.5) return base * 0.8
  if (original < 4.5) return base * 1.0
  return base * 1.5
}

function deriveRejectionCount(original: number): number {
  // Match BPI model's 0-1 rejection distribution
  if (original === 0) return 0
  if (original === 1) return randomBetween(0, 1, 0)
  return 1
}

function recalcDaysOverSLA(cycleTimeHours: number, stageCount: number, priority: string): number {
  let estimatedDays = Math.max(1, stageCount * 2);
  if (stageCount === 1 && priority.toLowerCase() === 'high') {
    estimatedDays = 1;
  }
  const estimatedHours = estimatedDays * 24;
  return Math.max(0, Number(((cycleTimeHours - estimatedHours) / 24).toFixed(4)))
}

// Removed enrichOriginalDistribution to maintain distribution alignment

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
  "cs": "customer service",
  
  "legal": "finance", // Assign Legal to Finance for heatmap coverage
  "compliance": "finance"
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

    const targetMaxMs = Date.now()
    const targetMinMs = targetMaxMs - (365 * 24 * 60 * 60 * 1000) // 1 year ago

    await m1Decision.deleteMany({})
    await Anomaly.deleteMany({})
    console.log("Cleared existing m1_decisions and anomalies collections")

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

      let completedAt =
        createdAt && durationMs !== null
          ? new Date(createdAt.getTime() + durationMs)
          : null

      // Organic simulation of pending tasks
      // Logic: Recent tasks (last 60 days) with high workload are more likely to be pending
      const isRecent = createdAt && (Date.now() - createdAt.getTime() < 60 * 24 * 60 * 60 * 1000)
      const workloadScore = parseInt(String(row.Employee_Workload ?? "0"), 10) || 0
      
      if (isRecent && Math.random() < (0.05 + (workloadScore / 100))) {
        completedAt = null;
      }

      const actualMinutes = parseNumber(row.Actual_Time_Minutes)
      const departmentMeta = mapDepartmentMeta(row.Department)

      if (!departmentMeta) {
        unknownDepartmentCount += 1
      }

      const originalCycleTimeHours = actualMinutes / 60
      const isDelayed = String(row.Delay_Flag ?? "").trim() === "1"
      // Map rejectionCount to BPI distribution: Reduced to lower anomaly count
      const baseRejectionCount = (isDelayed && Math.random() < 0.15) ? randomOneToThree() : 0
      
      const rawWorkload = parseInt(String(row.Employee_Workload ?? "0"), 10) || 0
      
      // Map revisionCount to BPI distribution: Reduced to lower anomaly count
      const baseRevisionCount = (rawWorkload > 50 && Math.random() < 0.10) ? randomOneToThree() : 0
      
      const baseCycleTimeHours = deriveCycleTime(originalCycleTimeHours)
      const baseStageCount = mapStageCount(row.Approval_Level)
      const priority = normalize(row.Priority_Level)

      // Use BPI-scaled cycle time hours to match Isolation Forest training distribution
      const cycleTimeHours = parseFloat(baseCycleTimeHours.toFixed(2))
      
      // Override completedAt based on BPI-scaled cycle time if task is complete
      if (createdAt && completedAt !== null) {
        completedAt = new Date(createdAt.getTime() + (cycleTimeHours * 3600 * 1000))
      }

      const rejectionCount = baseRejectionCount
      const revisionCount = baseRevisionCount
      const daysOverSLA = recalcDaysOverSLA(cycleTimeHours, baseStageCount, priority)

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
        stageCount: baseStageCount,
        hourOfDaySubmitted: createdAt ? createdAt.getHours() : null,
        priority: priority,
        source: 'ai_workflow',
        isScored: false
      })

      // Force demo anomalies (approx 2% of data)
      if (Math.random() < 0.02) {
        const last = docs[docs.length - 1];
        if (last) {
          last.rejectionCount = 15;
          last.revisionCount = 10;
          last.cycleTimeHours = 500;
          last.daysOverSLA = 20;
          last.completedAt = new Date(); // Ensure it's not pending
          last.status = "approved";
        }
      }

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
