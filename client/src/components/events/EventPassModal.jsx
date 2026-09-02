import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

function formatDate(d) {
return new Date(d).toLocaleDateString('en-IN', {
weekday: 'short',
day: 'numeric',
month: 'short',
year: 'numeric',
});
}

export default function EventPassModal({ registration, onClose }) {
if (!registration) return null;

const { event, registrationCode, qrToken } = registration;

console.log('Registration:', registration);
console.log('QR Token:', qrToken);

const handleCopyToken = async () => {
if (!qrToken) {
toast.error('QR Token is not available');
return;
}

```
try {
  await navigator.clipboard.writeText(qrToken);
  toast.success('QR Token copied successfully');
} catch (error) {
  toast.error('Could not copy QR Token');
}
```

};

return ( <div
   className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
   onClick={onClose}
   role="dialog"
   aria-modal="true"
 >
<div
onClick={(e) => e.stopPropagation()}
className="card w-full max-w-sm overflow-hidden"
>
{/* Header */} <div className="border-b border-surface-border bg-surface-raised px-5 py-3"> <p className="font-mono text-xs uppercase tracking-wide text-copper">
Event Pass </p> </div>


    {/* Content */}
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <h3 className="font-display text-lg font-semibold text-ink">
        {event?.title || 'Event'}
      </h3>

      <p className="font-mono text-xs text-ink-muted">
        {event?.eventDate
          ? formatDate(event.eventDate)
          : 'Date not available'}
        {' · '}
        {event?.venue || event?.mode || 'Venue not available'}
      </p>

      {/* QR Code */}
      <div className="rounded-lg border border-surface-border bg-white p-4">
        {qrToken ? (
          <QRCodeSVG
            value={qrToken}
            size={180}
            bgColor="#ffffff"
            fgColor="#0A0E17"
            level="M"
            includeMargin={true}
          />
        ) : (
          <div className="flex h-[180px] w-[180px] items-center justify-center px-4 text-center text-sm text-red-500">
            QR Token not available
          </div>
        )}
      </div>

      {/* Registration Code */}
      <div>
        <p className="text-xs text-ink-muted">
          Registration Code
        </p>

        <p className="mt-1 font-mono text-sm text-ink">
          {registrationCode || 'Not available'}
        </p>
      </div>

      {/* QR Token - useful for manual check-in/testing */}
      <div className="w-full rounded-lg border border-surface-border bg-surface-raised p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink-muted">
            QR Token
          </p>

          <button
            type="button"
            onClick={handleCopyToken}
            disabled={!qrToken}
            className="text-xs text-copper hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy
          </button>
        </div>

        <p className="mt-2 break-all font-mono text-xs text-ink">
          {qrToken || 'QR Token not available'}
        </p>
      </div>

      <p className="text-xs text-ink-faint">
        Show this QR code at the venue entrance for check-in.
      </p>
    </div>

    {/* Close Button */}
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
