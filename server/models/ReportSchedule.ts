import mongoose, { Schema, Document } from "mongoose";

export interface IReportSchedule extends Document {
  name: string;
  cronExpression: string;
  reportType: string;
  format: string;
  recipients: string[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

const ReportScheduleSchema: Schema = new Schema({
  name: { type: String, required: true },
  cronExpression: { type: String, required: true },
  reportType: { type: String, required: true },
  format: { type: String, required: true },
  recipients: [{ type: String, required: true }],
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  lastRun: Date,
  nextRun: Date
});

export default mongoose.model<IReportSchedule>(
  "m3_report_schedules",
  ReportScheduleSchema
);