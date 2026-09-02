import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { certificateApi } from '../services/certificate.service';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [result, setResult] = useState(null); // null | 'checking' | { valid, ... }

  const runVerification = async (value) => {
    if (!value.trim()) return;
    setResult('checking');
    try {
      const { data } = await certificateApi.verify(value.trim());
      setResult(data);
    } catch (err) {
      setResult({ valid: false });
    }
  };

  // Auto-verify if a code arrived via QR scan (?code=... in the URL).
  useEffect(() => {
    if (searchParams.get('code')) runVerification(searchParams.get('code'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runVerification(code);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Public verification</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Verify a certificate</h1>
      <p className="mt-3 text-sm text-ink-muted">Enter a certificate ID to confirm it was genuinely issued by Code Crafters Club.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
        <input
          className="field-input font-mono"
          placeholder="CCC-2026-A1B2C3"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">Verify</button>
      </form>

      {result === 'checking' && <p className="mt-6 font-mono text-sm text-ink-muted">$ checking…</p>}

      {result && result !== 'checking' && result.valid && (
        <div className="mt-6 rounded-md border border-active/30 bg-active/10 p-5">
          <p className="font-mono text-sm text-active">✓ Valid certificate</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">Student</dt><dd className="text-ink">{result.studentName}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Event</dt><dd className="text-ink">{result.eventTitle}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Event date</dt><dd className="text-ink">{formatDate(result.eventDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Issued</dt><dd className="text-ink">{formatDate(result.issuedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Certificate ID</dt><dd className="font-mono text-ink">{result.certificateCode}</dd></div>
          </dl>
        </div>
      )}

      {result && result !== 'checking' && !result.valid && (
        <div className="mt-6 rounded-md border border-danger/30 bg-danger/10 p-5">
          <p className="font-mono text-sm text-danger">✗ Not a valid certificate</p>
          <p className="mt-1 text-xs text-ink-muted">No certificate matches this ID. Double-check for typos.</p>
        </div>
      )}
    </div>
  );
}
