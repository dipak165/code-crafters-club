const { z } = require('zod');

const ROLES = [
  'STUDENT', 'PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM',
  'EVENT_MANAGEMENT_TEAM', 'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM', 'SUPER_ADMIN',
];

const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

module.exports = { updateRoleSchema, ROLES };
