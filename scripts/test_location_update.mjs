import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://razishad51_db_user:REDACTED@cluster0.efdzmyb.mongodb.net/?appName=Cluster0';
const DOWNTOWN_ID = '6a266b384f3000c2eed0584b';

const locationSchema = new mongoose.Schema({ 
  organizationId: mongoose.Schema.Types.ObjectId,
  name: String,
  address: String,
  isActive: { type: Boolean, default: true },
  deleted: { type: Boolean, default: false }
}, { timestamps: true });
const Location = mongoose.model('Location', locationSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  const loc = await Location.findById(DOWNTOWN_ID);
  console.log('BEFORE - isActive:', loc.isActive, 'deleted:', loc.deleted);
  
  // Test findByIdAndUpdate
  const updated = await Location.findByIdAndUpdate(DOWNTOWN_ID, { $set: { isActive: false } }, { new: true });
  console.log('AFTER findByIdAndUpdate - isActive:', updated.isActive);
  
  // Verify get
  const fetched = await Location.findById(DOWNTOWN_ID);
  console.log('GET after update - isActive:', fetched.isActive);
  
  // Restore
  await Location.findByIdAndUpdate(DOWNTOWN_ID, { $set: { isActive: true } });
  console.log('RESTORED');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err.message); process.exit(1); });
