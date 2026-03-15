import fs from "fs"
import path from "path"
import readline from "readline"
import dotenv from "dotenv"
import mongoose, { Types } from "mongoose"

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

function shiftDate(date: Date | null, offsetMs: number): Date | null {
  if (!date) return null
  return new Date(date.getTime() + offsetMs)
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

function departmentCandidateNames(doc: Record<string, unknown>): string[] {
  return [
    normalize(doc.name),
    normalize(doc.department),
    normalize(doc.departmentName),
    normalize(doc.title),
    normalize(doc.deptName),
    normalize(doc.code)
  ].filter(Boolean)
}

async function buildDepartmentMap(): Promise<Map<string, Types.ObjectId>> {
  const map = new Map<string, Types.ObjectId>()
  const docs = await mongoose.connection.collection("departments").find({}).toArray()

  for (const raw of docs) {
    const doc = raw as Record<string, unknown>
    const id = doc._id as Types.ObjectId | undefined
    if (!id) continue

    for (const key of departmentCandidateNames(doc)) {
      if (!map.has(key)) {
        map.set(key, id)
      }
    }
  }

  return map
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

    const departmentMap = await buildDepartmentMap()
    console.log(`Loaded ${departmentMap.size} department lookup keys`)

    const csvRows = await readCsvRows(CSV_PATH)
    console.log(`Parsed ${csvRows.length} CSV rows`)

    const latestSourceTime = csvRows.reduce((latest, row) => {
      const start = parseDate(row.Task_Start_Time)?.getTime() ?? 0
      const end = parseDate(row.Task_End_Time)?.getTime() ?? 0
      return Math.max(latest, start, end)
    }, 0)

    if (!latestSourceTime) {
      throw new Error("No valid timestamps found in CSV")
    }

    const offsetMs = Date.now() - latestSourceTime

    await m1Decision.deleteMany({})
    console.log("Cleared existing m1_decisions collection")

    const docs: Record<string, unknown>[] = []

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]

      const createdAt = shiftDate(parseDate(row.Task_Start_Time), offsetMs)
      const completedAt = shiftDate(parseDate(row.Task_End_Time), offsetMs)

      const actualMinutes = parseNumber(row.Actual_Time_Minutes)
      const estimatedMinutes = parseNumber(row.Estimated_Time_Minutes)

      const departmentName = normalize(row.Department)
      const departmentId = departmentMap.get(departmentName) ?? null

      docs.push({
        status: mapStatus(row.Task_Type),
        department: departmentId,
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
