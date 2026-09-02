const { PrismaClient } = require('@prisma/client');
const env = require('./env');

// Singleton pattern prevents exhausting DB connections via
// hot-reload in dev (each reload would otherwise spin up a
// fresh Prisma client / connection pool).
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
