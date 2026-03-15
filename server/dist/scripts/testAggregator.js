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
    const result = await (0, kpiAggregator_1.aggregateOrgKPI)(new Date("2026-01-01"), new Date());
    console.log("\n--- KPI Result ---");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}
test().catch(err => {
    console.error(err);
    process.exit(1);
});
