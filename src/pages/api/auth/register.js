import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import Note from '@/lib/Note';
import Task from '@/lib/Task';
import { signToken } from '@/lib/auth';

/**
 * POST /api/auth/register
 * Handles user signup, encrypts password, and migrates existing notes/tasks to the first registered Manager.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { name, email, password, role = 'Staff' } = req.body;

    // 1. Basic validation
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (!['Manager', 'Staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role selection' });
    }

    // 2. Duplicate checking
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // 4. Create User
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    });

    // 5. Dynamic Migration of M1 legacy data (userId: null)
    // If the registered user is a Manager and is the FIRST manager, inherit all legacy data
    let migratedCount = 0;
    if (role === 'Manager') {
      const otherManagersCount = await User.countDocuments({ role: 'Manager', _id: { $ne: user._id } });
      if (otherManagersCount === 0) {
        const notesMigration = await Note.updateMany({ userId: null }, { userId: user._id });
        const tasksMigration = await Task.updateMany({ userId: null }, { userId: user._id });
        migratedCount = notesMigration.modifiedCount + tasksMigration.modifiedCount;
        console.log(`[Migration] Cleanly migrated ${notesMigration.modifiedCount} notes and ${tasksMigration.modifiedCount} tasks to the first Manager: ${user.email}`);
      }
    }

    // 6. Generate Token
    const token = signToken(user);

    // 7. Respond with credentials
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      migratedCount,
    });
  } catch (error) {
    console.error('[Registration API Error]', error);
    return res.status(500).json({ error: 'Registration failed', detail: error.message });
  }
}
