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