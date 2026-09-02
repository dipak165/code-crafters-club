export const ADMIN_ROLES = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'TECHNICAL_TEAM',
  'EVENT_MANAGEMENT_TEAM',
  'HOSPITALITY_TEAM',
  'CONTENT_TEAM',
  'MARKETING_TEAM',
  'SUPER_ADMIN',
];

export const TEAM_LABELS = {
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  TECHNICAL_TEAM: 'Technical Team',
  EVENT_MANAGEMENT_TEAM: 'Event Management',
  HOSPITALITY_TEAM: 'Hospitality Team',
  CONTENT_TEAM: 'Content Team',
  MARKETING_TEAM: 'Marketing Team',
  SUPER_ADMIN: 'Super Admin',
  STUDENT: 'Student',
};

export function canCreateEvents(role) {
  return role === 'TECHNICAL_TEAM' || role === 'SUPER_ADMIN';
}

export function canManageAttendance(role) {
  return ['TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM', 'HOSPITALITY_TEAM', 'SUPER_ADMIN'].includes(role);
}
