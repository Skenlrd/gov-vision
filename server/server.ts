import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"

import { connectMongo } from "./config/db"
import { connectRedis } from "./config/redis"
import "./jobs/anomalyJob"
import "./jobs/forecastJob"

import analyticsRoutes from "./routes/analyticsRoutes"
import eventRoutes     from "./routes/eventRoutes"
import aiRoutes        from "./routes/aiRoutes"

const app  = express()
const PORT = process.env.PORT || 5002

/*
  Security and utility middleware.
  These must come BEFORE your routes.
*/
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    try {
      const url = new URL(origin)
      const isLocalhost =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1"

      if (isLocalhost) {
        callback(null, true)
        return
      }
    } catch {
      // Ignore malformed origins and fall through to rejection.
    }

    callback(new Error("Not allowed by CORS"))
  }
}))
app.use(morgan("dev"))
app.use(express.json())

/*
  Mount routes.
  Analytics and AI routes are protected by JWT inside
  the route files themselves.
  Event routes are protected by SERVICE_KEY inside
  the route files themselves.
*/
app.use("/api/analytics", analyticsRoutes)
app.use("/api/events",    eventRoutes)
app.use("/api/ai",        aiRoutes)

/*
  Health check — useful to confirm the server is running
  before testing in Postman.
*/
app.get("/health", (req, res) => {
  res.json({ status: "ok", module: "Module 3", port: PORT })
})

/*
  Connect to MongoDB and Redis, then start the server.
*/
async function startServer() {
  try {
    await connectMongo()

    try {
      await connectRedis()
    } catch (error) {
      console.warn("Redis unavailable, running without cache:", error)
    }

    app.listen(PORT, () => {
      console.log(`Module 3 server running on port ${PORT}`)
    })
  } catch (error) {
    console.error("Server startup failed:", error)
    process.exit(1)
  }
}

startServer()