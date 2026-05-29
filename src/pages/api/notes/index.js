import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await connectDB();
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    let query = {};
    if (decoded.role !== 'Manager') {
      query = { userId: decoded.userId };
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error('[GET /api/notes]', error);
    res.status(500).json({ error: 'Fetch failed', detail: error.message });
  }
}
