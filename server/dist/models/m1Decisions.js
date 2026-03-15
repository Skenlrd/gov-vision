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
  Read-only model for Module 1's decision collection.

  Module 3 uses this to:
  - Count decisions by status
  - Compute average cycle time
  - Pull feature data for Isolation Forest anomaly detection

  strict: false allows extra fields from Module 1 to
  pass through without causing Mongoose validation errors.
*/
const decisionSchema = new mongoose_1.Schema({
    status: {
        type: String
    },
    /*
      department is stored as a canonical plain string
      (for example: "finance", "human resources").
      Used to group KPIs by department without requiring
      a separate departments collection.
    */
    department: {
        type: String
    },
    createdAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    // These 5 fields are used as features by the
    // Isolation Forest model starting on Day 6
    cycleTimeHours: {
        type: Number
    },
    rejectionCount: {
        type: Number
    },
    revisionCount: {
        type: Number
    },
    daysOverSLA: {
        type: Number
    },
    stageCount: {
        type: Number
    }
}, {
    collection: "m1_decisions",
    strict: false
});
exports.default = mongoose_1.default.model("m1Decision", decisionSchema);
