const PDFKit = require('pdfkit');
const QRCode = require('qrcode');

// Renders the certificate exactly as spec section 19 describes:
// club name, "Certificate of Participation", student name, event
// name/date, certificate ID, and a QR verification code — laid out
// in the same copper/deep-blue palette as the web app, so a printed
// certificate still reads as "Code Crafters Club".
async function renderCertificatePdf({ studentName, eventTitle, eventDate, certificateCode, verifyUrl }) {
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill('#0A0E17');

    // Copper border frame
    doc
      .lineWidth(2)
      .strokeColor('#E8A33D')
      .rect(28, 28, W - 56, H - 56)
      .stroke();
    doc
      .lineWidth(0.75)
      .strokeColor('#5B7FFF')
      .rect(38, 38, W - 76, H - 76)
      .stroke();

    // Header
    doc
      .fillColor('#E8A33D')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('CODE CRAFTERS CLUB', 0, 70, { align: 'center', characterSpacing: 3 });

    doc
      .fillColor('#8D96AC')
      .fontSize(9)
      .font('Helvetica')
      .text('ENTC DEPARTMENT', 0, 92, { align: 'center', characterSpacing: 2 });

    doc
      .fillColor('#E9ECF5')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('Certificate of Participation', 0, 140, { align: 'center' });

    doc
      .fillColor('#8D96AC')
      .fontSize(12)
      .font('Helvetica')
      .text('This certificate is proudly presented to', 0, 195, { align: 'center' });

    doc
      .fillColor('#E8A33D')
      .fontSize(30)
      .font('Helvetica-Bold')
      .text(studentName, 0, 220, { align: 'center' });

    doc
      .fillColor('#8D96AC')
      .fontSize(12)
      .font('Helvetica')
      .text('for participating in', 0, 268, { align: 'center' });

    doc
      .fillColor('#E9ECF5')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(eventTitle, 60, 290, { align: 'center', width: W - 120 });

    doc
      .fillColor('#8D96AC')
      .fontSize(11)
      .font('Helvetica')
      .text(
        `conducted on ${new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        0,
        330,
        { align: 'center' }
      );

    // QR code (bottom-right) — opens the public verification page
    doc.image(qrBuffer, W - 150, H - 150, { width: 90 });
    doc
      .fillColor('#5C6478')
      .fontSize(7)
      .font('Helvetica')
      .text('Scan to verify', W - 150, H - 55, { width: 90, align: 'center' });

    // Certificate ID (own row, clearly separated from signatures below)
    doc
      .fillColor('#8D96AC')
      .fontSize(9)
      .font('Courier')
      .text(`Certificate ID: ${certificateCode}`, 60, H - 130);

    // Signature lines — President, Faculty Coordinator, Technical Team
    // (all three required per spec section 19)
    const sigY = H - 85;
    [
      ['President', 90, 140],
      ['Faculty Coordinator', 340, 150],
      ['Technical Team', 560, 110],
    ].forEach(([label, x, w]) => {
      doc.strokeColor('#2A3348').lineWidth(0.5).moveTo(x, sigY).lineTo(x + w, sigY).stroke();
      doc
        .fillColor('#5C6478')
        .fontSize(8)
        .font('Helvetica')
        .text(label, x, sigY + 6, { width: w, align: 'center' });
    });

    doc.end();
  });
}

module.exports = { renderCertificatePdf };
