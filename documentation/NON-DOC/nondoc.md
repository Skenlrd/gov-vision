1. KPI Snapshot Model

File

server/models/KpiSnapshot.ts
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
2. Anomaly Model

File

server/models/Anomaly.ts
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
3. Forecast Model

File

server/models/Forecast.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IForecast extends Document {
  department: string;
  forecastDate: Date;
  horizon: number;
  forecastData: any[];
}

const ForecastSchema: Schema = new Schema({
  department: String,
  forecastDate: Date,
  horizon: Number,

  forecastData: [
    {
      ds: Date,
      yhat: Number,
      yhat_lower: Number,
      yhat_upper: Number
    }
  ]
});

export default mongoose.model<IForecast>("m3_forecasts", ForecastSchema);
4. Report Model

File

server/models/Report.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  name: string;
  type: string;
  format: string;
  storagePath: string;
  status: string;
  createdAt: Date;
}

const ReportSchema: Schema = new Schema({
  name: String,
  type: String,
  format: String,
  storagePath: String,

  status: {
    type: String,
    enum: ["pending", "generating", "completed", "failed"],
    default: "pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IReport>("m3_reports", ReportSchema);
5. Report Schedule Model

File

server/models/ReportSchedule.ts
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


**11-03-2026 SETUP**
