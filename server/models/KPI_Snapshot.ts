import mongoose, { Schema, Document } from "mongoose";

export interface IKpiSnapshot extends Document {
  department: mongoose.Types.ObjectId;
  snapshotDate: Date;
  totalDecisions: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  avgCycleTimeHours: number;
  complianceRate: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
}

const KpiSnapshotSchema: Schema = new Schema({
  department: {
    type: Schema.Types.ObjectId,
    ref: "departments",
    required: true
  },
  snapshotDate: { type: Date, required: true },
  totalDecisions: { type: Number, required: true },
  approvedCount: { type: Number, required: true },
  rejectedCount: { type: Number, required: true },
  pendingCount: { type: Number, required: true },
  avgCycleTimeHours: { type: Number, required: true },
  complianceRate: { type: Number, required: true },
  riskScore: { type: Number, required: true },
  riskLevel: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    required: true
  }
});

export default mongoose.model<IKpiSnapshot>(
  "m3_kpi_snapshots",
  KpiSnapshotSchema
);