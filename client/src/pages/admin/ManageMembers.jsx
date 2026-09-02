import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { memberApi } from '../../services/member.service';
import { TEAM_LABELS } from '../../utils/roles';

const TEAMS = [
  'PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM',
  'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM',
];

const currentYear = new Date().getFullYear();

const emptyForm = {
  email: '', year: currentYear, team: 'TECHNICAL_TEAM', position: '',
  skills: '', description: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '', showContact: false,
};

export default function ManageMembers() {
  const [form, setForm] = useState(emptyForm);
  const [profileImage, setProfileImage] = useState(null);
  const [cv, setCv] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [year, setYear] = useState(currentYear);
  const [years, setYears] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadRoster = () => {
    setLoadingList(true);
    memberApi.byYear(year).then(({ data }) => setMembers(data.members)).catch(() => setMembers([])).finally(() => setLoadingList(false));
  };

  useEffect(() => {
    memberApi.years().then(({ data }) => setYears(data)).catch(() => {});
  }, []);

  useEffect(loadRoster, [year]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.position) return toast.error('Email and position are required.');

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, value));
    if (profileImage) fd.append('profileImage', profileImage);
    if (cv) fd.append('cv', cv);

    setSubmitting(true);
    try {
      await memberApi.add(fd);
      toast.success('Member added.');
      setForm({ ...emptyForm, year: form.year });
      setProfileImage(null);
      setCv(null);
      if (Number(form.year) === year) loadRoster();
      if (!years.includes(Number(form.year))) setYears([...years, Number(form.year)].sort((a, b) => b - a));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Remove this member from the roster for this year? Their record is preserved, just hidden from this year going forward.')) return;
    try {
      await memberApi.remove(memberId);
      toast.success('Member removed from this year.');
      loadRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove member.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Manage club members</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Add a registered student to a year's roster. They must already have an account — this doesn't create one.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Student email</label>
            <input required type="email" className="field-input" value={form.email} onChange={update('email')} placeholder="student@college.edu" />
          </div>
          <div>
            <label className="field-label">Academic year</label>
            <input required type="number" className="field-input" value={form.year} onChange={update('year')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Team</label>
            <select className="field-input" value={form.team} onChange={update('team')}>
              {TEAMS.map((t) => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Position / title</label>
            <input required className="field-input" value={form.position} onChange={update('position')} placeholder="Technical Lead" />
          </div>
        </div>

        <div>
          <label className="field-label">Skills (comma-separated)</label>
          <input className="field-input" value={form.skills} onChange={update('skills')} placeholder="React, Node.js, PostgreSQL" />
        </div>

        <div>
          <label className="field-label">Short description</label>
          <textarea rows={3} className="field-input resize-none" value={form.description} onChange={update('description')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">LinkedIn</label>
            <input className="field-input" value={form.linkedinUrl} onChange={update('linkedinUrl')} placeholder="https://linkedin.com/in/…" />
          </div>
          <div>
            <label className="field-label">GitHub</label>
            <input className="field-input" value={form.githubUrl} onChange={update('githubUrl')} placeholder="https://github.com/…" />
          </div>
          <div>
            <label className="field-label">Portfolio</label>
            <input className="field-input" value={form.portfolioUrl} onChange={update('portfolioUrl')} placeholder="https://…" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Profile photo (JPEG/PNG/WebP, max 2MB)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProfileImage(e.target.files[0])} className="text-sm text-ink-muted" />
          </div>
          <div>
            <label className="field-label">CV (PDF, max 5MB)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setCv(e.target.files[0])} className="text-sm text-ink-muted" />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-ink-muted">
          <input type="checkbox" className="h-4 w-4" checked={form.showContact} onChange={(e) => setForm({ ...form, showContact: e.target.checked })} />
          Show email, phone, and CV publicly on the team page
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Adding…' : 'Add member'}
        </button>
      </form>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Current roster</h2>
          <select className="field-input !w-32" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[...new Set([currentYear, ...years])].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loadingList && <p className="mt-4 font-mono text-sm text-ink-muted">$ loading…</p>}

        {!loadingList && members.length === 0 && (
          <p className="mt-4 font-mono text-sm text-ink-muted">No members for {year} yet.</p>
        )}

        <div className="mt-4 space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-surface-border bg-surface-raised/40 px-4 py-2.5">
              <div>
                <span className="text-sm text-ink">{m.name}</span>
                <span className="ml-2 font-mono text-xs text-ink-faint">{TEAM_LABELS[m.team]} · {m.position}</span>
              </div>
              <button onClick={() => handleRemove(m.id)} className="text-xs text-ink-muted hover:text-danger">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
