import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  type: "executive_summary" | "compliance" | "anomaly" | "risk";
  format: "csv" | "excel" | "pdf";
  status: "completed" | "pending" | "failed";
  filePath: string;
  parameters: {
    type: "executive_summary" | "compliance" | "anomaly" | "risk";
    format: "csv" | "excel" | "pdf";
    dateFrom: string;
    dateTo: string;
    departments: string[];
    requestedBy: string;
  };
  generatedAt: Date;
  generatedBy: string;
}

const ReportSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ["executive_summary", "compliance", "anomaly", "risk"],
    required: true
  },
  format: { type: String, enum: ["pdf", "excel", "csv"], required: true },
  status: {
    type: String,
    enum: ["completed", "pending", "failed"],
    default: "pending",
    required: true
  },
  filePath: { type: String, required: true },
  parameters: { type: Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  generatedBy: { type: String, required: true }
});

export default mongoose.model<IReport>("m3_reports", ReportSchema);