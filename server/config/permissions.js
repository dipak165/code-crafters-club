// ============================================================
// PERMISSION MATRIX — single source of truth for authorization.
//
// Why permissions instead of role checks scattered everywhere:
// "if (role === 'TECHNICAL_TEAM')" hardcoded in 40 places means
// changing what a team can do requires a code change + redeploy.
// Instead, routes declare the PERMISSION they need, and this
// table (also seeded into RolePermission in the DB so
// SUPER_ADMIN can reconfigure it at runtime) decides who has it.
// ============================================================

const ROLE_PERMISSIONS = {
  STUDENT: [],

  PRESIDENT: ['VIEW_ANALYTICS'],

  VICE_PRESIDENT: ['VIEW_ANALYTICS'],

  TECHNICAL_TEAM: [
    'CREATE_EVENT',
    'EDIT_EVENT',
    'DELETE_EVENT',
    'MANAGE_REGISTRATIONS',
    'MANAGE_ATTENDANCE',
    'GENERATE_CERTIFICATE',
    'MANAGE_MEMBERS',
    'MANAGE_ANNOUNCEMENTS',
    'VIEW_ANALYTICS',
    'MANAGE_GALLERY',
    'MANAGE_CONTENT',
    'MANAGE_RECRUITMENT',
    'MANAGE_LEADERBOARD',
  ],

  EVENT_MANAGEMENT_TEAM: ['MANAGE_REGISTRATIONS', 'MANAGE_ATTENDANCE'],

  HOSPITALITY_TEAM: ['MANAGE_ATTENDANCE'],

  CONTENT_TEAM: ['MANAGE_CONTENT', 'MANAGE_ANNOUNCEMENTS', 'MANAGE_GALLERY'],

  MARKETING_TEAM: ['MANAGE_CONTENT', 'MANAGE_GALLERY'],

  // SUPER_ADMIN implicitly has everything — handled in the
  // rbac middleware, not listed here, so it can never be
  // accidentally left off this list.
  SUPER_ADMIN: ['MANAGE_ROLES', 'VIEW_AUDIT_LOG'],
};

function roleHasPermission(role, permission) {
  if (role === 'SUPER_ADMIN') return true;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

module.exports = { ROLE_PERMISSIONS, roleHasPermission };
