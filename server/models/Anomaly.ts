import mongoose, { Schema, Document } from "mongoose";

export interface IAnomaly extends Document {
  decisionId: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  anomalyScore: number;
  severity: "Low" | "Medium" | "High" | "Critical" | "Normal";
  isAcknowledged: boolean;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  description: string;
  featureValues: Record<string, unknown>;
}

const AnomalySchema: Schema = new Schema({
  decisionId: { type: Schema.Types.ObjectId, ref: "m1_decisions", required: true },
  department: { type: Schema.Types.ObjectId, ref: "departments", required: true },
  anomalyScore: { type: Number, required: true },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical", "Normal"],
    required: true
  },
  isAcknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: "users" },
  acknowledgedAt: { type: Date },
  description: { type: String, required: true },
  featureValues: { type: Schema.Types.Mixed, required: true }
});

export default mongoose.model<IAnomaly>("m3_anomalies", AnomalySchema);