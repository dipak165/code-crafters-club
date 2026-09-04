import { QRCodeSVG } from 'qrcode.react';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Shown to a student for a CONFIRMED registration.
// Staff can scan the QR code or manually enter the QR token.
export default function EventPassModal({ registration, onClose }) {
  if (!registration) return null;

  const { event, registrationCode, qrToken } = registration;

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(qrToken);
      alert('Check-in token copied!');
    } catch (error) {
      console.error('Could not copy token:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm overflow-hidden"
      >
        <div className="border-b border-surface-border bg-surface-raised px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-wide text-copper">
            Event Pass
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6 text-center">

          {/* Event Details */}
          <h3 className="font-display text-lg font-semibold text-ink">
            {event.title}
          </h3>

          <p className="font-mono text-xs text-ink-muted">
            {formatDate(event.eventDate)} · {event.venue || event.mode}
          </p>

          {/* QR Code */}
          <div className="rounded-lg border border-surface-border bg-white p-4">
            <QRCodeSVG
              value={qrToken}
              size={180}
              bgColor="#ffffff"
              fgColor="#0A0E17"
              level="M"
            />
          </div>

          {/* Registration Code */}
          <div className="w-full">
            <p className="text-xs text-ink-faint">
              Registration Code
            </p>

            <p className="mt-1 font-mono text-sm text-ink">
              {registrationCode}
            </p>
          </div>

          {/* Manual Check-in Token */}
          <div className="w-full rounded-lg border border-copper/30 bg-copper/5 p-3">
            <p className="text-xs text-copper">
              Manual Check-in Token
            </p>

            <p className="mt-2 break-all font-mono text-xs text-ink">
              {qrToken}
            </p>

            <button
              type="button"
              onClick={handleCopyToken}
              className="mt-3 w-full rounded-md border border-copper/40 px-3 py-2 text-xs text-copper hover:bg-copper/10"
            >
              Copy Token
            </button>
          </div>

          <p className="text-xs text-ink-faint">
            Show this QR code at the venue entrance. Staff can scan the QR code
            or use the manual check-in token.
          </p>

        </div>

        <button
          onClick={onClose}
          className="w-full border-t border-surface-border py-3 text-sm text-ink-muted hover:text-ink"
        >
          Close
        </button>
      </div>
    </div>
  );
}