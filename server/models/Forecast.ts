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
  forecastData: IForecastPoint[];
}

const ForecastSchema: Schema = new Schema({
  department: { type: String, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  horizon: { type: Number, enum: [7, 14, 30], required: true },
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