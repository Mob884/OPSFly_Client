import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await connectDB();
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const access = await verifyLocationAccess(req, res, decoded);
    if (!access) return;

    const { selectedLocationId, user } = access;

    let query = {
      locationId: selectedLocationId
    };

    if (user.role === 'department_manager') {
      const deptUsers = await User.find({
        locationIds: selectedLocationId,
        department: user.department
      }).select('_id');
      const deptUserIds = deptUsers.map(u => u._id);
      query.userId = { $in: deptUserIds };
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error('[GET /api/notes]', error);
    res.status(500).json({ error: 'Fetch failed', detail: error.message });
  }
}
