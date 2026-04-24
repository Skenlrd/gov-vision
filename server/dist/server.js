"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const db_1 = require("./config/db");
const redis_1 = require("./config/redis");
require("./jobs/anomalyJob");
require("./jobs/forecastJob");
require("./jobs/riskScoringJob");
require("./jobs/reportScheduleJob");
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5002;
/*
  Security and utility middleware.
  These must come BEFORE your routes.
*/
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        try {
            const url = new URL(origin);
            const isLocalhost = url.hostname === "localhost" ||
                url.hostname === "127.0.0.1";
            if (isLocalhost) {
                callback(null, true);
                return;
            }
        }
        catch {
            // Ignore malformed origins and fall through to rejection.
        }
        callback(new Error("Not allowed by CORS"));
    }
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
/*
  Mount routes.
  Analytics and AI routes are protected by JWT inside
  the route files themselves.
  Event routes are protected by SERVICE_KEY inside
  the route files themselves.
*/
app.use("/api/analytics", analyticsRoutes_1.default);
app.use("/api/events", eventRoutes_1.default);
app.use("/api/ai", aiRoutes_1.default);
app.use("/api/reports", reportRoutes_1.default);
/*
  Health check — useful to confirm the server is running
  before testing in Postman.
*/
app.get("/health", (req, res) => {
    res.json({ status: "ok", module: "Module 3", port: PORT });
});
/*
  Connect to MongoDB and Redis, then start the server.
*/
async function startServer() {
    try {
        await (0, db_1.connectMongo)();
        try {
            await (0, redis_1.connectRedis)();
        }
        catch (error) {
            console.warn("Redis unavailable, running without cache:", error);
        }
        app.listen(PORT, () => {
            console.log(`Module 3 server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}
startServer();
