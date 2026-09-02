import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { recruitmentApi } from '../../services/recruitment.service';
import { TEAM_LABELS } from '../../utils/roles';

const STATUSES = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
const TEAMS = ['TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM', 'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM'];

const STATUS_STYLES = {
  APPLIED: 'text-ink-muted border-surface-border',
  UNDER_REVIEW: 'text-signal border-signal/30',
  SHORTLISTED: 'text-copper border-copper/30',
  INTERVIEW: 'text-copper border-copper/30',
  SELECTED: 'text-active border-active/30',
  REJECTED: 'text-danger border-danger/30',
};

export default function ManageRecruitment() {
  const [applications, setApplications] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = () => {
    setLoading(true);
    recruitmentApi
      .listAll({ status: statusFilter || undefined, team: teamFilter || undefined, page })
      .then((res) => { setApplications(res.data); setMeta(res.meta); })
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter, teamFilter, page]);

  const handleStatusChange = async (id, status) => {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await recruitmentApi.updateStatus(id, status);
      toast.success('Status updated.');
    } catch (err) {
      toast.error('Could not update status.');
      load();
    }
  };

  const handleDownload = async (app) => {
    setDownloadingId(app.id);
    try {
      await recruitmentApi.downloadResume(app.id, app.name);
    } catch (err) {
      toast.error('Could not download resume.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Recruitment applications</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <select className="field-input !w-auto" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="field-input !w-auto" value={teamFilter} onChange={(e) => { setPage(1); setTeamFilter(e.target.value); }}>
          <option value="">All teams</option>
          {TEAMS.map((t) => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
        </select>
      </div>

      {loading && <p className="mt-6 font-mono text-sm text-ink-muted">$ loading…</p>}
      {!loading && applications.length === 0 && <p className="mt-6 font-mono text-sm text-ink-muted">No applications match these filters.</p>}

      <div className="mt-6 space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{app.name}</p>
                <p className="font-mono text-xs text-ink-faint">{app.email} · {TEAM_LABELS[app.teamPreference]} · Class of {app.graduationYear}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value)}
                  className={`rounded-md border bg-surface px-2.5 py-1.5 font-mono text-xs ${STATUS_STYLES[app.status]}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)} className="text-xs text-ink-muted hover:text-ink">
                  {expandedId === app.id ? 'Hide' : 'Details'}
                </button>
              </div>
            </div>

            {expandedId === app.id && (
              <div className="mt-4 space-y-3 border-t border-surface-border pt-4 text-sm">
                <p><span className="text-ink-muted">Phone:</span> <span className="text-ink">{app.phone}</span></p>
                {app.skills?.length > 0 && (
                  <p><span className="text-ink-muted">Skills:</span> <span className="text-ink">{app.skills.join(', ')}</span></p>
                )}
                <p><span className="text-ink-muted">Motivation:</span></p>
                <p className="leading-relaxed text-ink">{app.motivation}</p>
                {app.experience && (
                  <>
                    <p><span className="text-ink-muted">Experience:</span></p>
                    <p className="leading-relaxed text-ink">{app.experience}</p>
                  </>
                )}
                <div className="flex flex-wrap gap-4 pt-2">
                  {app.githubUrl && <a href={app.githubUrl} target="_blank" rel="noreferrer" className="text-copper hover:text-copper-bright">GitHub</a>}
                  {app.linkedinUrl && <a href={app.linkedinUrl} target="_blank" rel="noreferrer" className="text-copper hover:text-copper-bright">LinkedIn</a>}
                  {app.resumeUrl && (
                    <button onClick={() => handleDownload(app)} disabled={downloadingId === app.id} className="text-copper hover:text-copper-bright">
                      {downloadingId === app.id ? 'Downloading…' : 'Download resume'}
                    </button>
                  )}
                </div>
              </div>
            )}
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
