import connectDB from '@/lib/mongodb';
import Organization from '@/lib/Organization';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  if (req.method === 'POST') {
    // Note: Creating organization from onboarding flow might not have token yet,
    // but we can allow public creation or auth-based creation.
    // The onboarding flow handles this as part of multi-step signup.
    // Let's support public creation here.
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      const org = await Organization.create({ name: name.trim() });
      return res.status(201).json(org);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create organization', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
