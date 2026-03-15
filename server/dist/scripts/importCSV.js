"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
dotenv_1.default.config();
const CSV_PATH = path_1.default.resolve(process.cwd(), "scripts", "AI_Workflow_Optimization_Dataset_2500_Rows_v1.csv");
function splitCsvLine(line) {
    const out = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            const next = line[i + 1];
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (ch === "," && !inQuotes) {
            out.push(current);
            current = "";
            continue;
        }
        current += ch;
    }
    out.push(current);
    return out.map(v => v.trim());
}
function parseDate(value) {
    if (!value)
        return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
function mapStartTimeToTargetWindow(start, sourceMinMs, sourceMaxMs, targetMinMs, targetMaxMs) {
    if (sourceMaxMs <= sourceMinMs) {
        return new Date(targetMinMs);
    }
    const ratio = (start.getTime() - sourceMinMs) / (sourceMaxMs - sourceMinMs);
    const mappedMs = targetMinMs + ratio * (targetMaxMs - targetMinMs);
    return new Date(mappedMs);
}
function parseNumber(value) {
    if (!value)
        return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function mapStatus(taskType) {
    if (taskType === "Approval")
        return "approved";
    if (taskType === "Escalation")
        return "rejected";
    return "pending";
}
function mapStageCount(level) {
    if (level === "Level 1")
        return 1;
    if (level === "Level 2")
        return 2;
    if (level === "Level 3")
        return 3;
    return 1;
}
function randomOneToThree() {
    return Math.floor(Math.random() * 3) + 1;
}
function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}
const DEPT_ALIAS_TO_CANONICAL = {
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
};
function normalizeDepartmentKey(value) {
    return normalize(value)
        .replace(/[._-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function mapDepartmentName(value) {
    const normalizedKey = normalizeDepartmentKey(value);
    if (!normalizedKey)
        return null;
    const canonical = DEPT_ALIAS_TO_CANONICAL[normalizedKey];
    return canonical ?? null;
}
async function readCsvRows(filePath) {
    const rows = [];
    const stream = fs_1.default.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline_1.default.createInterface({ input: stream, crlfDelay: Infinity });
    let headers = null;
    for await (const rawLine of rl) {
        const line = rawLine.replace(/\uFEFF/g, "").trim();
        if (!line)
            continue;
        if (!headers) {
            headers = splitCsvLine(line);
            continue;
        }
        const values = splitCsvLine(line);
        const row = {};
        for (let i = 0; i < headers.length; i++) {
            row[headers[i]] = values[i] ?? "";
        }
        rows.push(row);
    }
    return rows;
}
async function main() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing in .env");
        }
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        const csvRows = await readCsvRows(CSV_PATH);
        console.log(`Parsed ${csvRows.length} CSV rows`);
        const sourceStartTimes = csvRows
            .map(row => parseDate(row.Task_Start_Time)?.getTime())
            .filter((t) => typeof t === "number");
        if (sourceStartTimes.length === 0) {
            throw new Error("No valid timestamps found in CSV");
        }
        const sourceMinMs = Math.min(...sourceStartTimes);
        const sourceMaxMs = Math.max(...sourceStartTimes);
        const targetMinMs = new Date(2025, 0, 1, 0, 0, 0, 0).getTime();
        const targetMaxMs = new Date(2026, 2, 15, 0, 0, 0, 0).getTime();
        await m1Decisions_1.default.deleteMany({});
        console.log("Cleared existing m1_decisions collection");
        const docs = [];
        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            const originalStart = parseDate(row.Task_Start_Time);
            const originalEnd = parseDate(row.Task_End_Time);
            const createdAt = originalStart
                ? mapStartTimeToTargetWindow(originalStart, sourceMinMs, sourceMaxMs, targetMinMs, targetMaxMs)
                : null;
            const durationMs = originalStart && originalEnd
                ? originalEnd.getTime() - originalStart.getTime()
                : null;
            const completedAt = createdAt && durationMs !== null
                ? new Date(createdAt.getTime() + durationMs)
                : null;
            const actualMinutes = parseNumber(row.Actual_Time_Minutes);
            const estimatedMinutes = parseNumber(row.Estimated_Time_Minutes);
            const departmentName = mapDepartmentName(row.Department);
            docs.push({
                status: mapStatus(row.Task_Type),
                department: departmentName,
                createdAt,
                completedAt,
                cycleTimeHours: actualMinutes / 60,
                rejectionCount: String(row.Delay_Flag ?? "").trim() === "1" ? randomOneToThree() : 0,
                revisionCount: parseInt(String(row.Employee_Workload ?? "0"), 10) || 0,
                daysOverSLA: Math.max(0, (actualMinutes - estimatedMinutes) / 60 / 24),
                stageCount: mapStageCount(row.Approval_Level),
                hourOfDaySubmitted: createdAt ? createdAt.getHours() : null,
                priority: normalize(row.Priority_Level)
            });
            const prepared = i + 1;
            if (prepared % 100 === 0) {
                console.log(`Prepared ${prepared} rows`);
            }
        }
        let insertedTotal = 0;
        const batchSize = 100;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = docs.slice(i, i + batchSize);
            const inserted = await m1Decisions_1.default.insertMany(batch, { ordered: false });
            insertedTotal += inserted.length;
            if (insertedTotal % 100 === 0 || insertedTotal === docs.length) {
                console.log(`Inserted ${insertedTotal} rows`);
            }
        }
        console.log(`Total inserted: ${insertedTotal}`);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error("CSV import failed:", err);
        try {
            await mongoose_1.default.disconnect();
        }
        catch {
            // ignore disconnect issues
        }
        process.exit(1);
    }
}
main();
