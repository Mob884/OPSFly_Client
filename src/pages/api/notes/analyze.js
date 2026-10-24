import { analyzeTranscript } from '@/lib/analyzer';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ message: 'API is ALIVE' });
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await connectDB();
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const { transcript } = req.body;
    const user = await User.findById(decoded.userId);
    const analysis = await analyzeTranscript(transcript, user?.organizationId);
    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
}
