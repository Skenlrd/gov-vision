"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../config/db");
const anomalyJob_1 = require("../jobs/anomalyJob");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
async function main() {
    await (0, db_1.connectMongo)();
    await (0, anomalyJob_1.runAnomalyJob)();
    console.log("Manual anomaly run completed");
    process.exit(0);
}
main().catch((error) => {
    console.error("Manual anomaly run failed:", error);
    process.exit(1);
});
