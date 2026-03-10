import mongoose, { Schema, Document } from "mongoose";

export interface IReportSchedule extends Document {
  name: string;
  frequency: string;
  cronExpression: string;
  reportType: string;
  format: string;
  recipients: string[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

const ReportScheduleSchema: Schema = new Schema({
  name: String,
  frequency: String,
  cronExpression: String,

  reportType: String,
  format: String,

  recipients: [String],

  isActive: {
    type: Boolean,
    default: true
  },

  lastRun: Date,
  nextRun: Date
});

export default mongoose.model<IReportSchedule>(
  "m3_report_schedules",
  ReportScheduleSchema
);