import Location from './Location';
import User from './User';

/**
 * Helper to get accessible location IDs for a user based on role.
 * - owner: all locations in organization
 * - district_manager: user.locationIds
 * - gm / agm / department_manager: user.locationIds (which usually contains exactly one location)
 */
export async function getUserAccessibleLocationIds(user) {
  if (!user) return [];
  
  const role = user.role;
  
  if (role === 'owner') {
    if (!user.organizationId) return [];
    // Fetch all locations in the organization
    const locations = await Location.find({ organizationId: user.organizationId }).select('_id');
    return locations.map(l => l._id.toString());
  }
  
  if (!user.locationIds || user.locationIds.length === 0) return [];
  return user.locationIds.map(id => id.toString());
}

/**
 * Middleware checks location header or parameter.
 * Automatically resolves and validates requested location.
 * If authorized, returns selected locationId, organizationId, and the user document.
 * If not authorized, returns null and sets error response.
 */
export async function verifyLocationAccess(req, res, decodedUser) {
  // Decode location from headers or query params
  const reqLocationId = req.headers['x-location-id'] || req.query.locationId;
  
  // Get full user details from DB to have latest locationIds/role
  const user = await User.findById(decodedUser.userId || decodedUser.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  
  if (user.isActive === false || user.deleted === true) {
    res.status(403).json({ error: 'Unauthorized. Account is inactive or deactivated.' });
    return null;
  }
  
  const accessibleLocationIds = await getUserAccessibleLocationIds(user);
  
  if (accessibleLocationIds.length === 0) {
    res.status(403).json({ error: 'User does not have access to any locations' });
    return null;
  }
  
  let selectedLocationId = reqLocationId;
  
  // If no location ID is requested, default to the first accessible location
  if (!selectedLocationId) {
    selectedLocationId = accessibleLocationIds[0];
  }
  
  // Verify access to the selected location
  if (!accessibleLocationIds.includes(selectedLocationId.toString())) {
    res.status(403).json({ error: 'Forbidden. You do not have access to this location.' });
    return null;
  }
  
  return {
    selectedLocationId,
    organizationId: user.organizationId,
    user,
    accessibleLocationIds
  };
}
