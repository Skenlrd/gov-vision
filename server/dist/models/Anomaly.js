"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const AnomalySchema = new mongoose_1.Schema({
    decisionId: { type: mongoose_1.Schema.Types.ObjectId, ref: "m1_decisions", required: true },
    department: { type: String, required: true },
    anomalyScore: { type: Number, required: true },
    severity: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical", "Normal"],
        required: true
    },
    isAcknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "users" },
    acknowledgedAt: { type: Date },
    description: { type: String, required: true },
    featureValues: { type: mongoose_1.Schema.Types.Mixed, required: true }
});
exports.default = mongoose_1.default.model("m3_anomalies", AnomalySchema);
