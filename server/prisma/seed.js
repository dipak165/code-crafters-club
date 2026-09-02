// Seeds: permission matrix, a Super Admin, one member per team for
// club years 2024/2025/2026, some sample students, and point rules
// for the leaderboard. All data is dummy -- spec section 66.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { ROLE_PERMISSIONS } = require('../server/config/permissions');

const prisma = new PrismaClient();

async function seedPermissions() {
  const rows = [];
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permission of perms) {
      rows.push({ role, permission });
    }
  }
  for (const row of rows) {
    await prisma.rolePermission.upsert({
      where: { role_permission: { role: row.role, permission: row.permission } },
      update: {},
      create: row,
    });
  }
}

async function seedUser({ name, email, role, graduationYear = 2026 }) {
  const passwordHash = await bcrypt.hash('Passw0rd!', 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash,
      phone: '9999999999',
      collegeName: 'XYZ College of Engineering',
      graduationYear,
      role,
      emailVerified: true,
    },
  });
}

async function seedClubYear(year, description, membersByTeam) {
  const clubYear = await prisma.clubYear.upsert({
    where: { year },
    update: {},
    create: { year, description },
  });

  for (const [team, people] of Object.entries(membersByTeam)) {
    for (const person of people) {
      const user = await seedUser({ name: person.name, email: person.email, role: team });
      await prisma.clubMember.upsert({
        where: { userId_clubYearId: { userId: user.id, clubYearId: clubYear.id } },
        update: {},
        create: {
          userId: user.id,
          clubYearId: clubYear.id,
          team,
          position: person.position,
          skills: person.skills || [],
          description: person.description || '',
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding permissions...');
  await seedPermissions();

  console.log('Seeding super admin...');
  await seedUser({ name: 'Super Admin', email: 'superadmin@codecraftersclub.com', role: 'SUPER_ADMIN' });

  console.log('Seeding club years...');
  await seedClubYear(2025, 'Code Crafters Club — 2025 batch', {
    PRESIDENT: [{ name: 'Aarav Deshmukh', email: 'president2025@codecraftersclub.com', position: 'President' }],
    TECHNICAL_TEAM: [{ name: 'Isha Kulkarni', email: 'tech2025@codecraftersclub.com', position: 'Technical Lead', skills: ['React', 'Node.js'] }],
  });

  await seedClubYear(2026, 'Code Crafters Club — 2026 batch', {
    PRESIDENT: [{ name: 'Rohan Patil', email: 'president2026@codecraftersclub.com', position: 'President' }],
    VICE_PRESIDENT: [{ name: 'Sneha Joshi', email: 'vp2026@codecraftersclub.com', position: 'Vice President' }],
    TECHNICAL_TEAM: [
      { name: 'Dipak Shinde', email: 'tech2026@codecraftersclub.com', position: 'Technical Team', skills: ['React', 'Prisma', 'PostgreSQL'] },
    ],
    EVENT_MANAGEMENT_TEAM: [{ name: 'Meera Rane', email: 'events2026@codecraftersclub.com', position: 'Event Management' }],
    CONTENT_TEAM: [{ name: 'Aditya Kale', email: 'content2026@codecraftersclub.com', position: 'Content Team' }],
    MARKETING_TEAM: [{ name: 'Priya Naik', email: 'marketing2026@codecraftersclub.com', position: 'Marketing Team' }],
    HOSPITALITY_TEAM: [{ name: 'Karan Bhosale', email: 'hospitality2026@codecraftersclub.com', position: 'Hospitality Team' }],
  });

  console.log('Seeding sample students...');
  await seedUser({ name: 'Sample Student', email: 'student@example.com', role: 'STUDENT', graduationYear: 2027 });

  console.log('Seeding point rules...');
  const rules = [
    { action: 'EVENT_PARTICIPATION', points: 10 },
    { action: 'WORKSHOP', points: 5 },
    { action: 'HACKATHON', points: 20 },
    { action: 'WIN', points: 50 },
    { action: 'VOLUNTEER', points: 15 },
    { action: 'CERTIFICATE', points: 10 },
  ];
  for (const rule of rules) {
    await prisma.pointRule.upsert({ where: { action: rule.action }, update: {}, create: rule });
  }

  console.log('Seed complete. All demo accounts use password: Passw0rd!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
