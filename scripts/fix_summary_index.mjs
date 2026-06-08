import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://razishad51_db_user:REDACTED@cluster0.efdzmyb.mongodb.net/?appName=Cluster0';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  console.log('=== DailySummaries indexes ===');
  const indexes = await db.collection('dailysummaries').indexes();
  console.log(JSON.stringify(indexes, null, 2));
  
  // Drop the old non-compound date_1 index if it exists
  try {
    await db.collection('dailysummaries').dropIndex('date_1');
    console.log('✅ Dropped date_1 index successfully');
  } catch (err) {
    console.log('date_1 index not found or already dropped:', err.message);
  }
  
  console.log('\n=== DailySummaries indexes after fix ===');
  const indexesAfter = await db.collection('dailysummaries').indexes();
  console.log(JSON.stringify(indexesAfter, null, 2));
  
  await mongoose.disconnect();
}

run().catch(err => { console.error(err.message); process.exit(1); });
