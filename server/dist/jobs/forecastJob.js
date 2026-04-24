"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runForecastJob = runForecastJob;
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const cacheService_1 = require("../services/cacheService");
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
const Forecast_1 = __importDefault(require("../models/Forecast"));
const HORIZONS = [7, 14, 30];
const TARGETS = [
    "volume",
    "delay",
    "approval_rate",
    "rejection_rate"
];
async function runForecastJob() {
    console.log("[ForecastJob] Starting nightly forecast run...");
    let departments = await m1Decisions_1.default.distinct("department");
    if (!departments || departments.length === 0) {
        departments = await m1Decisions_1.default.distinct("departmentId");
    }
    if (!departments || departments.length === 0) {
        departments = await m1Decisions_1.default.distinct("departmentName");
    }
    const uniqueDepartments = Array.from(new Set([...(departments || []).filter(Boolean), "org"]));
    if (uniqueDepartments.length === 0) {
        console.log("[ForecastJob] No departments found. Skipping.");
        return;
    }
    console.log(`[ForecastJob] Generating forecasts for ${uniqueDepartments.length} departments.`);
    for (const deptId of uniqueDepartments) {
        for (const target of TARGETS) {
            for (const horizon of HORIZONS) {
                try {
                    const response = await axios_1.default.post(`${process.env.ML_SERVICE_URL}/ml/forecast/predict`, { dept_id: deptId, horizon, target }, { headers: { "x-service-key": process.env.SERVICE_KEY } });
                    const forecast = response.data.forecastData || response.data.forecast || [];
                    if (forecast.length === 0) {
                        console.warn(`[ForecastJob] No forecast rows returned for dept=${deptId}, target=${target}, horizon=${horizon}`);
                        continue;
                    }
                    await Forecast_1.default.findOneAndUpdate({ department: deptId, target, horizon }, {
                        $set: {
                            department: deptId,
                            target,
                            horizon,
                            generatedAt: new Date(),
                            forecastData: forecast.map((point) => ({
                                ds: new Date(point.ds),
                                yhat: point.yhat,
                                yhat_lower: point.yhat_lower,
                                yhat_upper: point.yhat_upper,
                            })),
                        },
                    }, { upsert: true, returnDocument: "after" });
                    await (0, cacheService_1.invalidate)(`m3:forecast:${deptId}:${target}:${horizon}`);
                    console.log(`[ForecastJob] Done: dept=${deptId}, target=${target}, horizon=${horizon}d`);
                }
                catch (err) {
                    console.error(`[ForecastJob] Failed dept=${deptId} target=${target} horizon=${horizon}:`, err.message);
                }
            }
        }
    }
    console.log("[ForecastJob] Nightly forecast run complete.");
}
node_cron_1.default.schedule("0 2 * * *", () => {
    runForecastJob().catch((err) => console.error("[ForecastJob] Uncaught error:", err));
});
console.log("[ForecastJob] Scheduled: nightly at 02:00.");
