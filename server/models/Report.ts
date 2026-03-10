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