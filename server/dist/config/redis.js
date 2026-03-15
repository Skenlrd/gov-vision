"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = exports.connectRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
const connectRedis = async () => {
    if (redisClient) {
        return redisClient;
    }
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const client = new ioredis_1.default(redisUrl, {
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
    }
    catch (error) {
        client.disconnect();
        throw error;
    }
};
exports.connectRedis = connectRedis;
const getRedisClient = () => {
    if (!redisClient) {
        throw new Error("Redis client is not initialized. Call connectRedis() first.");
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
