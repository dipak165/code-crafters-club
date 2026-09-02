import { useEffect, useState } from 'react';
import { auditLogApi } from '../../services/admin.service';

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });

  useEffect(() => {
    setLoading(true);
    auditLogApi.list({ page }).then((res) => { setLogs(res.data); setMeta(res.meta); }).catch(() => setLogs([])).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Super Admin</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Audit log</h1>
      <p className="mt-2 text-sm text-ink-muted">Every logged administrative action — event changes, member edits, certificate generation, role changes.</p>

      {loading && <p className="mt-6 font-mono text-sm text-ink-muted">$ loading…</p>}
      {!loading && logs.length === 0 && <p className="mt-6 font-mono text-sm text-ink-muted">No audit log entries yet.</p>}

      <div className="mt-6 space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-raised/40 px-4 py-3">
            <div>
              <p className="font-mono text-xs text-copper">{log.action}</p>
              <p className="mt-0.5 text-sm text-ink">{log.user?.name || 'Unknown'} <span className="text-ink-faint">· {log.entity}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</span></p>
            </div>
            <span className="shrink-0 font-mono text-xs text-ink-faint">{formatDate(log.createdAt)}</span>
          </div>
        ))}
      </div>

      {meta.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 font-mono text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-30">← prev</button>
          <span className="text-ink-muted">page {page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-30">next →</button>
        </div>
      )}
    </div>
  );
}
