import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const isSelf = id.toString() === (decoded.userId || decoded.id)?.toString();
  const isManagement = ['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(decoded.role);

  if (!isSelf && !isManagement) {
    return res.status(403).json({ error: 'Forbidden. You do not have permission to modify this user.' });
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const inviter = await User.findById(decoded.userId || decoded.id);

    // Security check: ensure target user is in the same organization
    if (targetUser.organizationId?.toString() !== inviter.organizationId?.toString()) {
      return res.status(403).json({ error: 'Forbidden. Cross-organization access denied.' });
    }

    const { name, email, role, locationIds, department, isActive, deleted, currentPassword, newPassword } = req.body;

    if (name) {
      targetUser.name = name.trim();
    }

    if (email && email.toLowerCase().trim() !== targetUser.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ error: 'Email address is already in use.' });
      }
      targetUser.email = email.toLowerCase().trim();
    }

    if (newPassword) {
      if (isSelf && !isManagement) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change password.' });
        }
        const isMatch = await bcrypt.compare(currentPassword.trim(), targetUser.password);
        if (!isMatch) {
          return res.status(400).json({ error: 'Incorrect current password.' });
        }
      }
      targetUser.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    // Collect boolean fields for findByIdAndUpdate to avoid Mongoose detection issues
    const booleanUpdates = {};

    // Role & Location assignments can only be changed by managers
    if (isManagement) {
      if (role) {
        // GM cannot promote someone to owner or district_manager
        if ((decoded.role === 'gm' || decoded.role === 'agm') && ['owner', 'district_manager'].includes(role)) {
          return res.status(403).json({ error: 'Forbidden. GMs cannot promote users to Owner or District Manager.' });
        }
        targetUser.role = role;
      }

      if (locationIds) {
        if (decoded.role === 'gm' || decoded.role === 'agm') {
          targetUser.locationIds = [inviter.locationIds[0]];
        } else {
          targetUser.locationIds = locationIds;
        }
      }

      if (department !== undefined) {
        targetUser.department = department || null;
      }

      if (isActive !== undefined) {
        booleanUpdates.isActive = isActive;
      }

      if (deleted !== undefined) {
        booleanUpdates.deleted = deleted;
        if (deleted === true) {
          booleanUpdates.isActive = false; // automatically set inactive on soft delete
        }
      }
    }

    // Save non-boolean fields first
    await targetUser.save();

    // Apply boolean fields via findByIdAndUpdate to avoid Mongoose change-detection issues
    let finalUser = targetUser;
    if (Object.keys(booleanUpdates).length > 0) {
      finalUser = await User.findByIdAndUpdate(
        id,
        { $set: booleanUpdates },
        { new: true }
      ).select('-password');
    }

    return res.json({ success: true, user: finalUser });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user', detail: error.message });
  }
}
