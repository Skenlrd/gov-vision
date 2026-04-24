import mongoose from "mongoose";
import dotenv from "dotenv";
import m1Decision from "../models/m1Decisions";
import Anomaly from "../models/Anomaly";

dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const deleted = await Anomaly.deleteMany({});
  console.log(`Deleted ${deleted.deletedCount} anomalies from old runs`);

  const updated = await m1Decision.updateMany({}, { $set: { isScored: false } });
  console.log(`Reset isScored to false for ${updated.modifiedCount} live decisions`);

  await mongoose.disconnect();
}

reset();
