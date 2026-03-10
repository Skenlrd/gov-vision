import mongoose, { Schema, Document } from "mongoose";

export interface IAnomaly extends Document {
  decisionId: string;
  department: string;
  anomalyScore: number;
  severity: string;
  description: string;
  isAcknowledged: boolean;
  detectedAt: Date;
}

const AnomalySchema: Schema = new Schema({
  decisionId: String,
  department: String,

  anomalyScore: Number,
  severity: String,
  description: String,

  isAcknowledged: { type: Boolean, default: false },
  detectedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAnomaly>("m3_anomalies", AnomalySchema);