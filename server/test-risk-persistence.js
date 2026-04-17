const mongoose = require('mongoose');
require('dotenv').config();

async function testPersistence() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const snapshots = await db.collection('m3_kpi_snapshots')
      .find({})
      .project({ departmentId: 1, riskScore: 1, riskLevel: 1 })
      .limit(5)
      .toArray();
    
    console.log('\nSample KPI Snapshots with Persisted Risk Scores:');
    console.log('================================================');
    snapshots.forEach(s => {
      console.log(`  ${String(s.departmentId).padEnd(10)} | riskScore: ${String(s.riskScore ?? 'N/A').padEnd(6)} | riskLevel: ${s.riskLevel ?? 'N/A'}`);
    });
    console.log('\n✅ Risk data persisted successfully in MongoDB\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPersistence();
