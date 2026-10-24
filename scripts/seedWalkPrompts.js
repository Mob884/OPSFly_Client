// Seeds walkPrompts into the existing restaurant IndustryConfig document.
// Additive only — does not touch any other field on the document.
//
// Usage: node scripts/seedWalkPrompts.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const WALK_PROMPTS = {
  shiftStartPrompt: "Time to walk the restaurant. Tap when you're ready to start.",
  walkActiveMessage: 'Walk is active. Tap to record when something needs attention.',
  endWalkPrompt: 'Good walk. Tap to end or it will close automatically.',
  endOfShiftQuestion1: "What's the #1 opportunity from your shift?",
  endOfShiftQuestion2: "What's the #1 strong point from your shift?",
  followUpPrompt: 'You marked [issue] as resolved. Is it still fixed?',
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const result = await db.collection('industryconfigs').updateOne(
    { industryType: 'restaurant' },
    { $set: { walkPrompts: WALK_PROMPTS } }
  );

  console.log('matched:', result.matchedCount, '| modified:', result.modifiedCount);

  const doc = await db.collection('industryconfigs').findOne({ industryType: 'restaurant' });
  console.log('walkPrompts now:', JSON.stringify(doc.walkPrompts, null, 2));

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
