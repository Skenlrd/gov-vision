import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  reportName: string;
  reportType: "Executive" | "Compliance" | "Decision" | "Department" | "Custom";
  format: string;
  status: "Completed" | "Failed" | "Generating";
  filePath: string;
  dateFrom: Date;
  dateTo: Date;
  departments: mongoose.Types.ObjectId[];
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;
}

const ReportSchema: Schema = new Schema({
  reportName: { type: String, required: true },
  reportType: {
    type: String,
    enum: ["Executive", "Compliance", "Decision", "Department", "Custom"],
    required: true
  },
  format: { type: String, enum: ["pdf", "excel", "csv"], required: true },
  status: {
    type: String,
    enum: ["Completed", "Failed", "Generating"],
    default: "Generating",
    required: true
  },
  filePath: { type: String, required: true },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  departments: [{ type: Schema.Types.ObjectId, ref: "departments", required: true }],
  generatedAt: { type: Date, required: true, default: Date.now },
  generatedBy: { type: Schema.Types.ObjectId, ref: "users", required: true }
});

export default mongoose.model<IReport>("m3_reports", ReportSchema);