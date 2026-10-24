// Shared detection logic for Four Corner Walk sessions.

/**
 * Determines which part of the restaurant a manager walks, from their role
 * and department. Kitchen/BOH department managers walk the kitchen; every
 * other manager (GM, AGM, FOH/Bar/Other department managers) walks the
 * full restaurant.
 */
export function detectWalkArea(role, department) {
  if (role === 'department_manager') {
    const dept = (department || '').toLowerCase();
    if (dept.includes('kitchen') || dept.includes('boh')) {
      return 'kitchen_boh';
    }
  }
  return 'full_restaurant';
}

/**
 * Determines the shift type from the current time, in the location's
 * timezone when known (falls back to server local time otherwise).
 *   5am–11am  -> opening
 *   11am–5pm  -> midshift
 *   5pm–5am   -> closing
 */
export function detectShiftType(timezone) {
  let hour;
  if (timezone) {
    try {
      hour = parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date()),
        10
      );
    } catch {
      hour = new Date().getHours();
    }
  } else {
    hour = new Date().getHours();
  }

  if (hour >= 5 && hour < 11) return 'opening';
  if (hour >= 11 && hour < 17) return 'midshift';
  return 'closing';
}
