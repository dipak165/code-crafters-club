import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';

import { eventApi } from '../../services/event.service';
import { attendanceApi } from '../../services/attendance.service';
import { certificateApi } from '../../services/certificate.service';
import { useAuth } from '../../context/AuthContext';

export default function CheckInScanner() {
  const { user } = useAuth();

  const canGenerateCertificates =
    user.role === 'TECHNICAL_TEAM' ||
    user.role === 'SUPER_ADMIN';

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [scannerStarted, setScannerStarted] = useState(false);

  // Load events
  useEffect(() => {
    eventApi
      .list({ limit: 50 })
      .then((res) => setEvents(res.data))
      .catch(() => {});
  }, []);

  // Load attendance summary
  useEffect(() => {
    if (!eventId) {
      setSummary(null);
      return;
    }

    attendanceApi
      .summary(eventId)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, [eventId, lastResult]);

  // Camera QR Scanner
  useEffect(() => {
    if (!scannerStarted) return undefined;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250,
        },
      },
      false
    );

    const onScanSuccess = async (decodedText) => {
      // QR contains the qrToken
      setToken(decodedText);

      toast.success('QR code scanned successfully!');

      try {
        await scanner.clear();
      } catch {
        // Ignore cleanup errors
      }

      setScannerStarted(false);
    };

    const onScanFailure = () => {
      // Ignore continuous scan failures
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scannerStarted]);

  // Mark attendance
  const handleCheckIn = async (e) => {
    e.preventDefault();

    if (!eventId) {
      return toast.error('Select an event first.');
    }

    if (!token.trim()) {
      return toast.error('Enter or scan a QR token.');
    }

    setBusy(true);

    try {
      const res = await attendanceApi.checkIn(
        eventId,
        token.trim()
      );

      toast.success(res.message);

      setLastResult(res.data);

      setToken('');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Check-in failed.'
      );

      setLastResult(null);
    } finally {
      setBusy(false);
    }
  };

  // Generate certificates
  const handleGenerateCertificates = async () => {
    if (!eventId) {
      return toast.error('Select an event first.');
    }

    setGenerating(true);

    try {
      const res =
        await certificateApi.generateForEvent(eventId);

      toast.success(res.message);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Could not generate certificates.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>

      <h1 className="font-display text-3xl font-semibold text-ink">
        Event check-in
      </h1>

      <p className="mt-2 text-sm text-ink-muted">
        Scan a student's QR pass to mark them present.
      </p>

      <div className="card mt-8 p-6">

        {/* Event Selection */}
        <label className="field-label">
          Event
        </label>

        <select
          className="field-input"
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setLastResult(null);
          }}
        >
          <option value="">
            Select an event…
          </option>

          {events.map((ev) => (
            <option
              key={ev.id}
              value={ev.id}
            >
              {ev.title}
            </option>
          ))}
        </select>

        {/* Attendance Summary */}
        {summary && (
          <div className="mt-4 flex justify-between rounded-md border border-surface-border bg-surface-raised/50 px-4 py-2.5 font-mono text-xs text-ink-muted">
            <span>
              {summary.present} / {summary.confirmed} checked in
            </span>

            <span>
              {summary.absent} remaining
            </span>
          </div>
        )}

        {/* Camera Scanner */}
        <div className="mt-6">

          {!scannerStarted ? (
            <button
              type="button"
              onClick={() => {
                if (!eventId) {
                  toast.error('Select an event first.');
                  return;
                }

                setScannerStarted(true);
              }}
              className="btn-secondary w-full"
            >
              📷 Open Camera Scanner
            </button>
          ) : (
            <div className="space-y-3">

              <div
                id="qr-reader"
                className="overflow-hidden rounded-lg border border-surface-border"
              />

              <button
                type="button"
                onClick={() => setScannerStarted(false)}
                className="btn-secondary w-full"
              >
                Close Camera
              </button>

            </div>
          )}

        </div>

        {/* Manual QR Entry */}
        <form
          onSubmit={handleCheckIn}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="field-label">
              QR token
            </label>

            <input
              className="field-input font-mono"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Scan QR or paste token manually"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full"
          >
            {busy
              ? 'Checking in…'
              : 'Check in'}
          </button>

        </form>

        {/* Successful Check-in */}
        {lastResult && (
          <div className="mt-6 rounded-md border border-active/30 bg-active/10 p-4 text-sm">

            <p className="font-medium text-active">
              ✓ {lastResult.studentName}
            </p>

            <p className="mt-1 font-mono text-xs text-ink-muted">
              {lastResult.registrationCode}
            </p>

          </div>
        )}

        {/* Generate Certificates */}
        {eventId && canGenerateCertificates && (
          <div className="mt-6 border-t border-surface-border pt-5">

            <button
              onClick={handleGenerateCertificates}
              disabled={generating}
              className="btn-secondary w-full text-sm"
            >
              {generating
                ? 'Generating…'
                : 'Generate certificates for checked-in students'}
            </button>

            <p className="mt-2 text-center text-xs text-ink-faint">
              Only issues certificates for students marked present.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}