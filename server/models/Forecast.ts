import mongoose, { Schema, Document } from "mongoose";

interface IForecastPoint {
  ds: Date;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface IForecast extends Document {
  department: string;
  generatedAt: Date;
  horizon: 7 | 14 | 30;
  target: "volume" | "delay" | "approval_rate" | "rejection_rate" | "pending_workload" | "sla_misses";
  forecastData: IForecastPoint[];
}

const ForecastSchema: Schema = new Schema({
  department: { type: String, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  horizon: { type: Number, enum: [7, 14, 30], required: true },
  target: {
    type: String,
    enum: ["volume", "delay", "approval_rate", "rejection_rate", "pending_workload", "sla_misses"],
    required: true,
    default: "volume"
  },
  forecastData: [
    {
      ds: { type: Date, required: true },
      yhat: { type: Number, required: true },
      yhat_lower: { type: Number, required: true },
      yhat_upper: { type: Number, required: true }
    }
  ]
});

export default mongoose.model<IForecast>("m3_forecasts", ForecastSchema);