import "dotenv/config";

import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { connectMongo } from "./config/db";
import { connectRedis } from "./config/redis";

const app = express();
const port = Number(process.env.PORT || 5002);

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json({
		status: "ok",
		service: "gov-vision-backend",
		timestamp: new Date().toISOString()
	});
});

const startServer = async (): Promise<void> => {
	try {
		await connectMongo();

		try {
			await connectRedis();
		} catch (error) {
			console.warn("Redis unavailable. Continuing without Redis cache.", error);
		}

		app.listen(port, () => {
			console.log(`Server listening on port ${port}`);
		});
	} catch (error) {
		console.error("Failed to start backend server", error);
		process.exit(1);
	}
};

void startServer();
