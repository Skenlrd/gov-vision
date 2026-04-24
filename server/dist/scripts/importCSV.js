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
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
const CSV_PATH = path_1.default.resolve(__dirname, "../Dataset", "AI_Workflow_Optimization_Dataset_2500_Rows_v1.csv");
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
function mapStatus(taskType, completedAt) {
    // FIX: Check completedAt first - if null, decision is still pending
    if (completedAt === null)
        return "pending";
    if (taskType === "Approval")
        return "approved";
    if (taskType === "Escalation")
        return "rejected";
    return "approved";
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
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomBetween(min, max, decimals = 2) {
    const factor = 10 ** decimals;
    const raw = Math.random() * (max - min) + min;
    return Math.round(raw * factor) / factor;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function deriveCycleTime(original) {
    // Center around 43h to match BPI model's 12x scaled distribution
    const base = randomBetween(20, 60, 2);
    if (original < 2.5)
        return base * 0.8;
    if (original < 4.5)
        return base * 1.0;
    return base * 1.5;
}
function deriveRejectionCount(original) {
    // Match BPI model's 0-1 rejection distribution
    if (original === 0)
        return 0;
    if (original === 1)
        return randomBetween(0, 1, 0);
    return 1;
}
function recalcDaysOverSLA(cycleTimeHours, stageCount, priority) {
    let estimatedDays = Math.max(1, stageCount * 2);
    if (stageCount === 1 && priority.toLowerCase() === 'high') {
        estimatedDays = 1;
    }
    const estimatedHours = estimatedDays * 24;
    return Math.max(0, Number(((cycleTimeHours - estimatedHours) / 24).toFixed(4)));
}
// Removed enrichOriginalDistribution to maintain distribution alignment
function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}
const DEPT_CANONICAL_META = {
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
};
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
    "cs": "customer service",
    "legal": "finance", // Assign Legal to Finance for heatmap coverage
    "compliance": "finance"
};
function normalizeDepartmentKey(value) {
    return normalize(value)
        .replace(/[._-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function mapDepartmentMeta(value) {
    const normalizedKey = normalizeDepartmentKey(value);
    if (!normalizedKey)
        return null;
    const canonical = DEPT_ALIAS_TO_CANONICAL[normalizedKey];
    if (!canonical)
        return null;
    return DEPT_CANONICAL_META[canonical] ?? null;
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
        const targetMaxMs = Date.now();
        const targetMinMs = targetMaxMs - (365 * 24 * 60 * 60 * 1000); // 1 year ago
        await m1Decisions_1.default.deleteMany({});
        console.log("Cleared existing m1_decisions collection");
        const docs = [];
        let unknownDepartmentCount = 0;
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
            let completedAt = createdAt && durationMs !== null
                ? new Date(createdAt.getTime() + durationMs)
                : null;
            // Simulate 5% pending cases for recent tasks
            if (Math.random() < 0.05 && createdAt && (Date.now() - createdAt.getTime() < 30 * 24 * 60 * 60 * 1000)) {
                completedAt = null;
            }
            const actualMinutes = parseNumber(row.Actual_Time_Minutes);
            const departmentMeta = mapDepartmentMeta(row.Department);
            if (!departmentMeta) {
                unknownDepartmentCount += 1;
            }
            const originalCycleTimeHours = actualMinutes / 60;
            const originalRejectionCount = String(row.Delay_Flag ?? "").trim() === "1" ? randomOneToThree() : 0;
            const baseRevisionCount = parseInt(String(row.Employee_Workload ?? "0"), 10) || 0;
            const baseCycleTimeHours = deriveCycleTime(originalCycleTimeHours);
            const baseRejectionCount = deriveRejectionCount(originalRejectionCount);
            const baseStageCount = mapStageCount(row.Approval_Level);
            const priority = normalize(row.Priority_Level);
            // Use BPI-scaled cycle time hours to match Isolation Forest training distribution
            const cycleTimeHours = parseFloat(baseCycleTimeHours.toFixed(2));
            // Override completedAt based on BPI-scaled cycle time if task is complete
            if (createdAt && completedAt !== null) {
                completedAt = new Date(createdAt.getTime() + (cycleTimeHours * 3600 * 1000));
            }
            const rejectionCount = baseRejectionCount;
            const revisionCount = baseRevisionCount;
            const daysOverSLA = recalcDaysOverSLA(cycleTimeHours, baseStageCount, priority);
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
            });
            const prepared = i + 1;
            if (prepared % 100 === 0) {
                console.log(`Prepared ${prepared} rows`);
            }
        }
        if (unknownDepartmentCount > 0) {
            console.warn(`Rows with unknown department: ${unknownDepartmentCount}`);
        }
        let insertedTotal = 0;
        const batchSize = 100;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = docs.slice(i, i + batchSize);
            const inserted = await m1Decisions_1.default.insertMany(batch, { ordered: false });
            insertedTotal += inserted.length;
            if (insertedTotal % 500 === 0 || insertedTotal === docs.length) {
                console.log(`Inserted ${insertedTotal} rows`);
            }
        }
        console.log(`\nTotal inserted: ${insertedTotal}`);
        console.log(`  python training/train_isolation_forest.py`);
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
