import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { signToken } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Handles logging in, validates email and password, and issues JWT.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { email, password } = req.body;

    // 1. Validation
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 2. Find User
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is deactivated or deleted
    if (user.isActive === false || user.deleted === true) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Generate Token
    const token = signToken(user);

    // 5. Respond
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Login API Error]', error);
    return res.status(500).json({ error: 'Login failed', detail: error.message });
  }
}
