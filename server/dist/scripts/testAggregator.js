"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const kpiAggregator_1 = require("../services/kpiAggregator");
async function test() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    console.log("Connected");
    const startDate = new Date("2025-01-01");
    const endDate = new Date();
    const orgResult = await (0, kpiAggregator_1.aggregateOrgKPI)(startDate, endDate);
    await (0, kpiAggregator_1.aggregateAllDepartments)(startDate, endDate);
    console.log("\n--- ORG KPI ---");
    console.log(JSON.stringify(orgResult, null, 2));
    console.log("\n--- All department snapshots saved ---");
    process.exit(0);
}
test().catch(err => {
    console.error(err);
    process.exit(1);
});
