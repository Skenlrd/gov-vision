import mongoose, { Schema, Document } from "mongoose";

export interface IReportSchedule extends Document {
  name: string;
  reportConfig: {
    type: string;
    format: string;
    departments: string[];
    dateRangeMode: "last_7_days" | "last_30_days" | "last_90_days";
  };
  frequency: "daily" | "weekly" | "monthly";
  nextRunAt: Date;
  lastRunAt?: Date;
  lastRunStatus?: "success" | "failed" | "pending";
  recipients: string[];
  isActive: boolean;
  createdBy: string;
}

const ReportScheduleSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    reportConfig: { type: Schema.Types.Mixed, required: true },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    nextRunAt: { type: Date, required: true },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ["success", "failed", "pending"], default: "pending" },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    createdBy: { type: String, default: "unknown" },
    recipients: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model<IReportSchedule>(
  "m3_report_schedules",
  ReportScheduleSchema
);