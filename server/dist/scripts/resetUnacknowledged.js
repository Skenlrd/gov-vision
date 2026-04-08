"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("../config/db");
const Anomaly_1 = __importDefault(require("../models/Anomaly"));
async function main() {
    await (0, db_1.connectMongo)();
    const docs = await Anomaly_1.default.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("_id")
        .lean();
    const ids = docs.map((d) => d._id);
    if (ids.length === 0) {
        console.log("No anomaly docs found");
        process.exit(0);
    }
    const result = await Anomaly_1.default.updateMany({ _id: { $in: ids } }, {
        $set: { isAcknowledged: false },
        $unset: { acknowledgedBy: "", acknowledgedAt: "" }
    });
    const total = await Anomaly_1.default.countDocuments({ isAcknowledged: false });
    const grouped = await Anomaly_1.default.aggregate([
        { $match: { isAcknowledged: false } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    console.log(`Reset ${result.modifiedCount} anomalies to unacknowledged`);
    console.log(`Unacknowledged total: ${total}`);
    console.log(`By severity: ${JSON.stringify(grouped)}`);
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
