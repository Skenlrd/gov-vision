"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const DEPARTMENTS = [
    { name: "Finance", isActive: true },
    { name: "Human Resources", isActive: true },
    { name: "Operations", isActive: true },
    { name: "Information Technology", isActive: true },
    { name: "Customer Service", isActive: true }
];
async function main() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing in .env");
        }
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        const departments = mongoose_1.default.connection.collection("departments");
        for (const dept of DEPARTMENTS) {
            await departments.updateOne({ name: dept.name }, { $set: { name: dept.name, isActive: dept.isActive } }, { upsert: true });
        }
        const inserted = await departments
            .find({ name: { $in: DEPARTMENTS.map(d => d.name) } })
            .toArray();
        const ordered = DEPARTMENTS.map(d => inserted.find(i => i.name === d.name)).filter(Boolean);
        console.log("Department ObjectIds:");
        ordered.forEach(doc => {
            console.log(`${doc.name}: ${doc._id.toString()}`);
        });
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error("seedDepartments failed:", err);
        try {
            await mongoose_1.default.disconnect();
        }
        catch {
            // ignore disconnect errors
        }
        process.exit(1);
    }
}
main();
