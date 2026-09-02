const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// --- public reads ------------------------------------------------

async function listPublished(limit = 20) {
  return prisma.announcement.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

async function getPublishedById(id) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement || announcement.status !== 'PUBLISHED') {
    throw new AppError('Announcement not found.', 404);
  }
  return announcement;
}

// --- staff reads/writes --------------------------------------------

async function listAll(limit = 50) {
  return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}

async function create(input, creatorId) {
  return prisma.announcement.create({
    data: {
      title: input.title,
      content: input.content,
      imageUrl: input.imageUrl || null,
      status: input.status,
      createdBy: creatorId,
      // Only stamp publishedAt if it's going live immediately —
      // a draft has no publish date yet.
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
    },
  });
}

async function update(id, input) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new AppError('Announcement not found.', 404);

  const data = { ...input };

  // publishedAt is set exactly once, the first time an announcement
  // transitions into PUBLISHED — re-editing already-published content
  // (fixing a typo, say) must not bump it back to "just now" and jump
  // the homepage ordering, and un-publishing then re-publishing later
  // should read as "originally posted then", not reset either.
  if (input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED' && !existing.publishedAt) {
    data.publishedAt = new Date();
  }

  return prisma.announcement.update({ where: { id }, data });
}

async function remove(id) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new AppError('Announcement not found.', 404);
  return prisma.announcement.delete({ where: { id } });
}

module.exports = { listPublished, getPublishedById, listAll, create, update, remove };
