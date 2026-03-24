// src/auth.js — Client-side RBAC guard used by all portal entry scripts

/**
 * Validates the current session and returns the session payload.
 * Redirects to '/' if the session is invalid or the role doesn't match.
 *
 * @param {'member'|'staff'|'management'} requiredRole
 * @returns {Promise<{memberId?, staffId?, email, role}>}
 */
export async function requireRole(requiredRole) {
  let session;
  try {
    const res = await fetch('/api/validate-session', { credentials: 'include' });
    session   = await res.json();
  } catch {
    window.location.replace('/');
    throw new Error('session check failed');
  }

  if (!session.valid) {
    window.location.replace('/');
    throw new Error('not authenticated');
  }

  if (session.role !== requiredRole) {
    // Redirect to the correct portal rather than the root
    const portals = { member: '/member', staff: '/staff', management: '/management' };
    window.location.replace(portals[session.role] || '/');
    throw new Error(`wrong role: expected ${requiredRole}, got ${session.role}`);
  }

  return session;
}

/**
 * Calls /api/logout and redirects to '/'.
 */
export async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  } finally {
    window.location.replace('/');
  }
}
