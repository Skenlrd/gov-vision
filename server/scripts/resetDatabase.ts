import mongoose from "mongoose"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function resetDatabase() {
  const DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/govvision"
  
  console.log("Connecting to MongoDB...")
  await mongoose.connect(DB_URI)
  
  const db = mongoose.connection.db
  if (!db) {
    console.error("Database connection not established")
    await mongoose.disconnect()
    process.exit(1)
  }
  
  console.log("\nClearing collections...")
  
  try {
    // Backup and clear m1_decisions
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    if (collectionNames.includes("m1_decisions")) {
      const backupName = `m1_decisions_backup_${Date.now()}`
      await db.collection("m1_decisions").rename(backupName)
      console.log(`✓ Backed up m1_decisions to ${backupName}`)
    }
    
    if (collectionNames.includes("m1_training_decisions")) {
      await db.collection("m1_training_decisions").drop()
      console.log("✓ Dropped m1_training_decisions")
    }
    
    if (collectionNames.includes("m3_kpi_snapshots")) {
      await db.collection("m3_kpi_snapshots").drop()
      console.log("✓ Dropped m3_kpi_snapshots")
    }
    
    if (collectionNames.includes("m3_anomalies")) {
      await db.collection("m3_anomalies").drop()
      console.log("✓ Dropped m3_anomalies")
    }
    
    if (collectionNames.includes("m3_forecasts")) {
      await db.collection("m3_forecasts").drop()
      console.log("✓ Dropped m3_forecasts")
    }
    
    if (collectionNames.includes("m3_reports")) {
      await db.collection("m3_reports").drop()
      console.log("✓ Dropped m3_reports")
    }
    
    console.log("\n✅ Database reset complete!")
    console.log("\nNext steps:")
    console.log("1. npm run import:bpi")
    console.log("2. cd ml_service && python training/train_isolation_forest.py")
    console.log("3. cd ml_service && python training/train_prophet.py")
    console.log("4. cd ml_service && python training/train_random_forest.py")
    console.log("5. npm run import:csv")
    console.log("6. npm run job:anomaly")
    
  } catch (error) {
    console.error("Error during reset:", error)
  }
  
  await mongoose.disconnect()
  console.log("\nDisconnected from MongoDB")
}

resetDatabase().catch(console.error)
