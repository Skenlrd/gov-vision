import mongoose from "mongoose";

export const connectMongo = async (): Promise<void> => {
	const mongoUri = process.env.MONGODB_URI;

	if (!mongoUri) {
		throw new Error("MONGODB_URI is not set in environment variables");
	}

	await mongoose.connect(mongoUri);
	console.log("MongoDB connected");
};
