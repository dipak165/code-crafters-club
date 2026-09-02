const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { renderCertificatePdf } = require('../utils/certificatePdf.util');
const { sendMail, templates } = require('../utils/email.util');
const env = require('../config/env');

// Local disk storage for generated PDFs. Fine for development; the
// spec (section 40) recommends object storage (Cloudinary/S3) for
// production — swapping the two writeCertificateFile()/readCertificateFile()
// functions below for a Cloudinary upload/fetch is the entire migration,
// nothing else in this module needs to change.
const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'certificates');

function ensureStorageDir() {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function writeCertificateFile(certificateCode, buffer) {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, `${certificateCode}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function readCertificateFile(certificateCode) {
  const filePath = path.join(STORAGE_DIR, `${certificateCode}.pdf`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function generateCertificateCode() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CCC-${year}-${suffix}`;
}

function generateVerificationHash(certificateCode, registrationId) {
  return crypto.createHash('sha256').update(`${certificateCode}:${registrationId}`).digest('hex');
}

// --- generate (bulk, per event) ------------------------------------

async function generateForEvent(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found.', 404);
  if (!event.certificateEnabled) {
    throw new AppError('Certificates are not enabled for this event.', 400);
  }

  // Business rule: certificates are only ever generated for
  // registrations attendance has already marked ELIGIBLE (set during
  // QR check-in) — never for "registered but never showed up".
  const eligible = await prisma.eventRegistration.findMany({
    where: { eventId, certificateStatus: 'ELIGIBLE' },
    include: { user: true, certificate: true },
  });

  const results = { issued: 0, skipped: 0, errors: [] };

  // eslint-disable-next-line no-restricted-syntax
  for (const registration of eligible) {
    if (registration.certificate) {
      results.skipped += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      const certificateCode = generateCertificateCode();
      const verifyUrl = `${env.clientUrl}/verify-certificate?code=${certificateCode}`;

      // eslint-disable-next-line no-await-in-loop
      const pdfBuffer = await renderCertificatePdf({
        studentName: registration.user.name,
        eventTitle: event.title,
        eventDate: event.eventDate,
        certificateCode,
        verifyUrl,
      });

      writeCertificateFile(certificateCode, pdfBuffer);

      // eslint-disable-next-line no-await-in-loop
      await prisma.certificate.create({
        data: {
          certificateCode,
          userId: registration.userId,
          eventId,
          registrationId: registration.id,
          certificateUrl: `/api/certificates/${certificateCode}/download`,
          verificationHash: generateVerificationHash(certificateCode, registration.id),
        },
      });

      // eslint-disable-next-line no-await-in-loop
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { certificateStatus: 'ISSUED' },
      });

      const mail = templates.certificateReady(registration.user.name, event.title, certificateCode);
      // eslint-disable-next-line no-await-in-loop
      await sendMail({ to: registration.user.email, ...mail }).catch(() => {});

      // eslint-disable-next-line no-await-in-loop
      await require('./leaderboard.service')
        .awardForCertificate(registration.userId, eventId)
        .catch(() => {}); // never let a leaderboard hiccup block certificate issuance

      results.issued += 1;
    } catch (err) {
      results.errors.push({ userId: registration.userId, message: err.message });
    }
  }

  return results;
}

// --- student-facing --------------------------------------------------

async function getMyCertificates(userId) {
  return prisma.certificate.findMany({
    where: { userId },
    include: { event: { select: { title: true, eventDate: true, slug: true } } },
    orderBy: { issuedAt: 'desc' },
  });
}

async function getCertificateFile(certificateCode, requestingUser) {
  const certificate = await prisma.certificate.findUnique({ where: { certificateCode } });
  if (!certificate) throw new AppError('Certificate not found.', 404);

  const isOwner = certificate.userId === requestingUser.id;
  const isStaff = ['TECHNICAL_TEAM', 'SUPER_ADMIN'].includes(requestingUser.role);
  if (!isOwner && !isStaff) {
    throw new AppError('You do not have permission to download this certificate.', 403);
  }

  const buffer = readCertificateFile(certificateCode);
  if (!buffer) throw new AppError('Certificate file is missing. Please contact the club.', 500);

  return buffer;
}

// --- public verification ------------------------------------------

// Deliberately returns only what the spec allows (section 20): no
// email, no phone, no internal IDs — just enough to confirm the
// certificate is genuine.
async function verifyCertificate(certificateCode) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateCode },
    include: { user: { select: { name: true } }, event: { select: { title: true, eventDate: true } } },
  });

  if (!certificate) {
    return { valid: false };
  }

  return {
    valid: true,
    certificateCode: certificate.certificateCode,
    studentName: certificate.user.name,
    eventTitle: certificate.event.title,
    eventDate: certificate.event.eventDate,
    issuedAt: certificate.issuedAt,
  };
}

module.exports = {
  generateForEvent,
  getMyCertificates,
  getCertificateFile,
  verifyCertificate,
};
