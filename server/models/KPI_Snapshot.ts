import mongoose, { Schema, Document } from "mongoose";

export interface IKpiSnapshot extends Document {
  snapshotDate: Date;
  department: string;
  totalDecisions: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  avgCycleTimeHours: number;
  complianceRate: number;
  violationCount: number;
  anomalyCount: number;
  riskScore: number;
  riskLevel: string;
}

const KpiSnapshotSchema: Schema = new Schema({
  snapshotDate: { type: Date, required: true },
  department: { type: String, required: true },

  totalDecisions: Number,
  approvedCount: Number,
  rejectedCount: Number,
  pendingCount: Number,

  avgCycleTimeHours: Number,
  complianceRate: Number,
  violationCount: Number,

  anomalyCount: Number,

  riskScore: Number,
  riskLevel: String
});

export default mongoose.model<IKpiSnapshot>(
  "m3_kpi_snapshots",
  KpiSnapshotSchema
);