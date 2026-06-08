import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  // Verify inviter role (owner or gm/Manager)
  if (!['owner', 'gm', 'Manager'].includes(decoded.role)) {
    return res.status(403).json({ error: 'Forbidden. Only owners and general managers can invite users.' });
  }

  try {
    const { name, email, password, role, locationIds = [], department } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Resolve organizationId from current user
    const inviter = await User.findById(decoded.userId || decoded.id);
    if (!inviter) return res.status(404).json({ error: 'Inviter not found' });

    // Owner can assign any locations. GM can only assign their own location.
    let finalLocationIds = locationIds;
    if (decoded.role === 'gm' || decoded.role === 'agm') {
      finalLocationIds = [inviter.locationIds[0]];
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      organizationId: inviter.organizationId,
      locationIds: finalLocationIds,
      department: department || null,
    });

    return res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId,
        locationIds: newUser.locationIds,
        department: newUser.department,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to invite user', detail: error.message });
  }
}
