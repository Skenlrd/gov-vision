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
/*
  Model for Module 1's live decision collection (AI Workflow dataset).

  This is used by the dashboard for all KPIs and analytics,
  and by the anomalyJob to score new decisions against the frozen model.
*/
const decisionSchema = new mongoose_1.Schema({
    decisionId: { type: String, index: true },
    status: { type: String },
    department: { type: String },
    departmentId: { type: String, index: true },
    departmentName: { type: String },
    createdAt: { type: Date, index: true },
    completedAt: { type: Date },
    cycleTimeHours: { type: Number },
    rejectionCount: { type: Number },
    revisionCount: { type: Number },
    daysOverSLA: { type: Number },
    stageCount: { type: Number },
    hourOfDaySubmitted: { type: Number },
    priority: { type: String },
    // Live Tracking & ML Scoring Fields
    source: { type: String, default: 'ai_workflow', index: true },
    isScored: { type: Boolean, default: false, index: true },
    anomalyScore: { type: Number },
    isAnomaly: { type: Boolean },
    lastScoredAt: { type: Date }
}, {
    collection: "m1_decisions",
    strict: true
});
// Compound index to quickly find unscored completed cases
decisionSchema.index({ isScored: 1, completedAt: -1 });
exports.default = mongoose_1.default.model("m1Decision", decisionSchema);
