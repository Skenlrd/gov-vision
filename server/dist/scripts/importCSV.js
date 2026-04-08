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
function mapStatus(taskType, completedAt) {
    if (taskType === "Approval")
        return "approved";
    if (taskType === "Escalation")
        return "rejected";
    if (completedAt !== null)
        return "approved";
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
    if (original < 2.5)
        return randomBetween(0.5, 8, 2);
    if (original < 4.5)
        return randomBetween(4, 24, 2);
    return randomBetween(20, 120, 2);
}
function deriveRejectionCount(original) {
    if (original === 0)
        return randomBetween(0, 1.5, 1);
    if (original === 1)
        return randomBetween(1, 3.5, 1);
    if (original === 2)
        return randomBetween(2, 5.5, 1);
    return randomBetween(4, 8, 1);
}
function recalcDaysOverSLA(cycleTimeHours, revisionCount) {
    const estimatedHours = revisionCount * 0.8;
    return Math.max(0, Number(((cycleTimeHours - estimatedHours) / 24).toFixed(4)));
}
// Pure unsupervised distribution
// No labels or pre-selected anomalies are assigned.
// A random roll places each row into a realistic tier.
// The model then discovers unusual rows statistically.
function enrichOriginalDistribution(base) {
    const roll = Math.random();
    let cycleTimeHours = base.cycleTimeHours;
    let rejectionCount = base.rejectionCount;
    let revisionCount = base.revisionCount;
    let stageCount = base.stageCount;
    if (roll < 0.82) {
        // 82% normal decisions with slight variation.
        cycleTimeHours = cycleTimeHours * randomBetween(0.9, 1.15, 3);
        rejectionCount = rejectionCount + randomBetween(0, 0.8, 1);
        revisionCount = revisionCount + randomBetween(0, 1.2, 1);
    }
    else if (roll < 0.94) {
        // 12% borderline decisions.
        cycleTimeHours = cycleTimeHours * randomBetween(1.2, 2.0, 3);
        rejectionCount = rejectionCount + randomBetween(0.8, 2.5, 1);
        revisionCount = revisionCount + randomBetween(1, 3.5, 1);
        stageCount = Math.max(stageCount, randomInt(2, 3));
    }
    else if (roll < 0.99) {
        // 5% elevated decisions.
        cycleTimeHours = cycleTimeHours * randomBetween(2.0, 3.8, 3);
        rejectionCount = rejectionCount + randomBetween(2, 5, 1);
        revisionCount = revisionCount + randomBetween(3, 7, 1);
        stageCount = 3;
    }
    else {
        // 1% critical outliers.
        cycleTimeHours = randomBetween(60, 160, 2);
        rejectionCount = randomBetween(6, 12, 1);
        revisionCount = randomBetween(8, 16, 1);
        stageCount = 3;
    }
    return {
        cycleTimeHours: clamp(Number(cycleTimeHours.toFixed(2)), 0.3, 200),
        rejectionCount: clamp(Number(rejectionCount.toFixed(1)), 0, 15),
        revisionCount: clamp(Number(revisionCount.toFixed(1)), 0, 20),
        stageCount: clamp(Math.round(stageCount), 1, 3)
    };
}
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
    "cs": "customer service"
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
        const targetMinMs = Date.UTC(2025, 0, 1, 0, 0, 0, 0);
        const targetMaxMs = Date.UTC(2026, 2, 15, 23, 59, 59, 999);
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
            const completedAt = createdAt && durationMs !== null
                ? new Date(createdAt.getTime() + durationMs)
                : null;
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
            // Pure unsupervised enrichment.
            const enriched = enrichOriginalDistribution({
                cycleTimeHours: baseCycleTimeHours,
                rejectionCount: baseRejectionCount,
                revisionCount: baseRevisionCount,
                stageCount: baseStageCount
            });
            const cycleTimeHours = createdAt && completedAt
                ? parseFloat(((completedAt.getTime() - createdAt.getTime())
                    / 1000 / 3600).toFixed(2))
                : parseFloat((actualMinutes / 60).toFixed(2));
            const rejectionCount = enriched.rejectionCount;
            const revisionCount = enriched.revisionCount;
            const daysOverSLA = recalcDaysOverSLA(cycleTimeHours, revisionCount);
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
