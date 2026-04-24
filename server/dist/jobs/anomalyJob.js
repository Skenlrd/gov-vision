"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnomalyDetection = runAnomalyDetection;
exports.runAnomalyJob = runAnomalyJob;
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
const Anomaly_1 = __importDefault(require("../models/Anomaly"));
const cacheService_1 = require("../services/cacheService");
async function runAnomalyDetection() {
    console.log("[AnomalyJob] Starting anomaly detection run...");
    const decisions = await m1Decisions_1.default.find({
        completedAt: { $exists: true, $ne: null },
        isScored: false
    })
        .select("_id cycleTimeHours rejectionCount revisionCount daysOverSLA department")
        .lean();
    if (decisions.length === 0) {
        console.log("[AnomalyJob] No completed decisions found. Skipping.");
        return;
    }
    console.log(`[AnomalyJob] Loaded ${decisions.length} decisions for scoring.`);
    const payload = decisions.map((d) => ({
        id: d._id.toString(),
        cycleTimeHours: d.cycleTimeHours || 0,
        rejectionCount: d.rejectionCount || 0,
        revisionCount: d.revisionCount || 0,
        daysOverSLA: d.daysOverSLA || 0
    }));
    let results = [];
    try {
        const response = await axios_1.default.post(`${process.env.ML_SERVICE_URL}/ml/anomaly/predict`, { decisions: payload }, { headers: { "x-service-key": process.env.SERVICE_KEY } });
        results = response.data.results;
        console.log(`[AnomalyJob] FastAPI returned ${results.length} scores.`);
    }
    catch (err) {
        console.error("[AnomalyJob] FastAPI call failed:", err.message);
        return;
    }
    const anomalies = results.filter((r) => r.isAnomaly === true);
    console.log(`[AnomalyJob] ${anomalies.length} anomalies detected.`);
    const bulkOps = results.map(r => ({
        updateOne: {
            filter: { _id: new mongoose_1.default.Types.ObjectId(r.id) },
            update: {
                $set: {
                    isScored: true,
                    anomalyScore: r.anomalyScore,
                    isAnomaly: r.isAnomaly,
                    lastScoredAt: new Date()
                }
            }
        }
    }));
    await m1Decisions_1.default.bulkWrite(bulkOps);
    for (const anomaly of anomalies) {
        const original = decisions.find((d) => d._id.toString() === anomaly.id);
        const featureValues = original
            ? {
                cycleTimeHours: original.cycleTimeHours || 0,
                rejectionCount: original.rejectionCount || 0,
                revisionCount: original.revisionCount || 0,
                daysOverSLA: original.daysOverSLA || 0
            }
            : {};
        if (!mongoose_1.default.Types.ObjectId.isValid(anomaly.id)) {
            continue;
        }
        const decisionObjectId = new mongoose_1.default.Types.ObjectId(anomaly.id);
        await Anomaly_1.default.findOneAndUpdate({ decisionId: decisionObjectId }, {
            $set: {
                anomalyScore: anomaly.anomalyScore,
                severity: anomaly.severity,
                isAnomaly: true,
                department: original?.department || "unknown",
                featureValues,
                description: `Anomaly detected: score ${anomaly.anomalyScore.toFixed(3)}, severity ${anomaly.severity}`
            },
            $setOnInsert: {
                isAcknowledged: false,
                decisionId: decisionObjectId
            }
        }, { upsert: true, new: true });
    }
    await (0, cacheService_1.invalidate)("m3:anomalies:active");
    console.log("[AnomalyJob] Redis cache invalidated. Run complete.");
}
async function runAnomalyJob() {
    await runAnomalyDetection();
}
node_cron_1.default.schedule("0 0 * * *", () => {
    runAnomalyJob().catch((err) => {
        console.error("[AnomalyJob] Uncaught error in cron run:", err);
    });
});
console.log("[AnomalyJob] Scheduled: every 24 hours (daily at 00:00).");
