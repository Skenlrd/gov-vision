"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAnomalyPredict = callAnomalyPredict;
const axios_1 = __importDefault(require("axios"));
async function callAnomalyPredict(decisions) {
    const baseUrl = process.env.ML_SERVICE_URL;
    const serviceKey = process.env.SERVICE_KEY;
    if (!baseUrl) {
        throw new Error("ML_SERVICE_URL is not configured");
    }
    if (!serviceKey) {
        throw new Error("SERVICE_KEY is not configured");
    }
    const url = `${baseUrl}/ml/anomaly/predict`;
    const responses = await Promise.all(decisions.map(async (decision) => {
        const response = await axios_1.default.post(url, decision, {
            headers: {
                "x-service-key": serviceKey
            }
        });
        return response.data;
    }));
    return responses;
}
