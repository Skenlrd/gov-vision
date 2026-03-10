import Redis from "ioredis";

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis> => {
	if (redisClient) {
		return redisClient;
	}

	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	const client = new Redis(redisUrl, {
		lazyConnect: true,
		maxRetriesPerRequest: 1,
		retryStrategy: () => null,
		reconnectOnError: () => false
	});

	client.on("error", () => {
		// Optional mode: suppress repeated unhandled redis errors when unavailable.
	});

	try {
		await client.connect();
		redisClient = client;
		console.log("Redis connected");
		return redisClient;
	} catch (error) {
		client.disconnect();
		throw error;
	}
};

export const getRedisClient = (): Redis => {
	if (!redisClient) {
		throw new Error("Redis client is not initialized. Call connectRedis() first.");
	}

	return redisClient;
};
