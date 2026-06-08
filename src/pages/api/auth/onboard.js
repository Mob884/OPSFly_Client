import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/Organization';
import Location from '@/lib/Location';
import User from '@/lib/User';
import { signToken } from '@/lib/auth';

/**
 * POST /api/auth/onboard
 * Performs full 5-step onboarding:
 * 1. Creates Organization with industry
 * 2. Creates multiple Locations (up to 5)
 * 3. Creates Owner account linked to all locations
 * 4. Creates invited Team Members with generated temp passwords
 * 5. Returns token, user details, and list of invited members with passwords
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const { orgName, orgIndustry = 'Restaurant', locations = [], name, email, password, invites = [] } = req.body;

    if (!orgName?.trim() || locations.length === 0 || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Missing required onboarding details (orgName, locations, name, email, password)' });
    }

    // Check duplicate email for Owner
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An owner account with this email address already exists' });
    }

    // Validate emails inside invites for duplicates
    if (invites.length > 0) {
      const inviteEmails = invites.map(i => i.email.toLowerCase().trim());
      const duplicatesInDB = await User.find({ email: { $in: inviteEmails } }).select('email');
      if (duplicatesInDB.length > 0) {
        const dupStr = duplicatesInDB.map(u => u.email).join(', ');
        return res.status(409).json({ error: `The following invited emails already have accounts: ${dupStr}` });
      }
    }

    // 1. Create Organization
    const organization = await Organization.create({
      name: orgName.trim(),
      industry: orgIndustry
    });

    // 2. Create Locations
    const createdLocations = [];
    for (const loc of locations) {
      const newLoc = await Location.create({
        organizationId: organization._id,
        name: loc.name.trim(),
        address: loc.address?.trim() || '',
      });
      createdLocations.push(newLoc);
    }
    const locationIds = createdLocations.map(l => l._id);

    // 3. Create Owner User
    const hashedOwnerPassword = await bcrypt.hash(password.trim(), 10);
    const owner = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedOwnerPassword,
      role: 'owner',
      organizationId: organization._id,
      locationIds, // owner gets access to all locations
    });

    // 4. Create invited team members
    const invitedMembersResponse = [];
    for (const inv of invites) {
      // Resolve location ID by index
      const locIdx = inv.locationIndex ?? 0;
      const targetLocId = createdLocations[locIdx]?._id || createdLocations[0]._id;

      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + '123';
      const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

      const invitedUser = await User.create({
        name: inv.name.trim(),
        email: inv.email.toLowerCase().trim(),
        password: hashedTempPassword,
        role: inv.role,
        organizationId: organization._id,
        locationIds: [targetLocId],
        department: inv.role === 'department_manager' ? inv.department : undefined
      });

      invitedMembersResponse.push({
        name: invitedUser.name,
        email: invitedUser.email,
        role: invitedUser.role,
        tempPassword
      });
    }

    const token = signToken(owner);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        organizationId: organization._id,
        locationIds,
      },
      invitedMembers: invitedMembersResponse
    });
  } catch (error) {
    console.error('[Onboarding API Error]', error);
    return res.status(500).json({ error: 'Onboarding failed', detail: error.message });
  }
}
