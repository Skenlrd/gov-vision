"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrSet = getOrSet;
exports.invalidate = invalidate;
/*
  Import the shared Redis client created on Day 1.
  Never instantiate a second Redis connection here.
*/
const redis_1 = require("../config/redis");
/*
  getOrSet is a generic cache helper.

  How it works:
  1. Check Redis for the key
  2. If found, parse the JSON and return it (cache HIT)
  3. If not found, call fetchFn() to get fresh data
  4. Store the fresh data in Redis with the given TTL
  5. Return the fresh data (cache MISS)

  Example usage:
  const data = await getOrSet<IKpiSummary>(
    "m3:kpi:finance:2026-03-11",
    300,
    () => aggregateKPI("finance", dateFrom, dateTo)
  )

  The generic <T> means TypeScript knows exactly what
  type comes back — no `any` casting needed.
*/
async function getOrSet(key, ttlSeconds, fetchFn) {
    let redis;
    try {
        redis = (0, redis_1.getRedisClient)();
    }
    catch {
        // Redis is optional in local/dev mode.
        return fetchFn();
    }
    /*
      Try to get from cache first
    */
    let cached = null;
    try {
        cached = await redis.get(key);
    }
    catch {
        return fetchFn();
    }
    if (cached) {
        // Cache HIT — parse and return immediately
        return JSON.parse(cached);
    }
    /*
      Cache MISS — call the actual data function
    */
    const freshData = await fetchFn();
    /*
      Store in Redis.
      "EX" sets expiry in seconds.
      After ttlSeconds the key is automatically deleted.
    */
    try {
        await redis.set(key, JSON.stringify(freshData), "EX", ttlSeconds);
    }
    catch {
        // Ignore cache write failures; return fresh data.
    }
    return freshData;
}
/*
  invalidate deletes all Redis keys matching a pattern.

  Called by the webhook receiver whenever a decision
  or violation changes so the dashboard shows fresh data.

  Example:
  await invalidate("m3:kpi:finance:*")
  → deletes all cached KPI snapshots for finance dept

  await invalidate("m3:kpi:*")
  → clears all KPI cache for all departments
*/
async function invalidate(pattern) {
    let redis;
    try {
        redis = (0, redis_1.getRedisClient)();
    }
    catch {
        return;
    }
    let keys = [];
    try {
        keys = await redis.keys(pattern);
    }
    catch {
        return;
    }
    if (keys.length > 0) {
        try {
            await redis.del(...keys);
        }
        catch {
            // Ignore cache delete failures in optional-cache mode.
        }
    }
}
