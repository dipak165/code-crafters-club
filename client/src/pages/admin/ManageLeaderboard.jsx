import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { leaderboardApi } from '../../services/leaderboard.service';

const ACTION_LABELS = {
  EVENT_PARTICIPATION: 'Event participation',
  WORKSHOP: 'Workshop participation',
  HACKATHON: 'Hackathon participation',
  WIN: 'Winning an event',
  VOLUNTEER: 'Volunteering',
  CERTIFICATE: 'Certificate earned',
};

export default function ManageLeaderboard() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAction, setEditingAction] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [awardForm, setAwardForm] = useState({ userId: '', action: 'WIN', note: '' });
  const [awarding, setAwarding] = useState(false);

  const load = () => {
    leaderboardApi.rules().then(({ data }) => setRules(data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (rule) => {
    setEditingAction(rule.action);
    setEditValue(String(rule.points));
  };

  const saveEdit = async (action) => {
    try {
      await leaderboardApi.updateRule(action, Number(editValue));
      toast.success('Point value updated.');
      setEditingAction(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update.');
    }
  };

  const handleAward = async (e) => {
    e.preventDefault();
    if (!awardForm.userId) return toast.error('Enter a student user ID.');
    setAwarding(true);
    try {
      const res = await leaderboardApi.award(awardForm);
      toast.success(res.message);
      setAwardForm({ userId: '', action: 'WIN', note: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not award points.');
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Leaderboard settings</h1>

      <div className="card mt-8 p-6">
        <h2 className="font-display text-sm font-semibold text-copper">Point values</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Participation and certificate points are awarded automatically at check-in / certificate issuance.
          These values control how many points each action is worth.
        </p>

        {loading && <p className="mt-4 font-mono text-sm text-ink-muted">$ loading…</p>}

        <div className="mt-4 space-y-2">
          {rules.map((rule) => (
            <div key={rule.action} className="flex items-center justify-between rounded-md border border-surface-border bg-surface-raised/40 px-4 py-2.5">
              <span className="text-sm text-ink">{ACTION_LABELS[rule.action] || rule.action}</span>
              {editingAction === rule.action ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="field-input !w-20 !py-1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(rule.action)} className="text-xs text-copper hover:text-copper-bright">Save</button>
                  <button onClick={() => setEditingAction(null)} className="text-xs text-ink-muted">Cancel</button>
                </div>
              ) : (
                <button onClick={() => startEdit(rule)} className="font-mono text-sm text-copper hover:text-copper-bright">
                  {rule.points} pts
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-sm font-semibold text-copper">Manually award points</h2>
        <p className="mt-1 text-xs text-ink-faint">
          For WIN and VOLUNTEER — these don't have an automatic trigger yet, so award them here.
        </p>

        <form onSubmit={handleAward} className="mt-4 space-y-3">
          <div>
            <label className="field-label">Student user ID</label>
            <input className="field-input" value={awardForm.userId} onChange={(e) => setAwardForm({ ...awardForm, userId: e.target.value })} placeholder="paste the student's user ID" />
          </div>
          <div>
            <label className="field-label">Reason</label>
            <select className="field-input" value={awardForm.action} onChange={(e) => setAwardForm({ ...awardForm, action: e.target.value })}>
              <option value="WIN">Winning an event</option>
              <option value="VOLUNTEER">Volunteering</option>
            </select>
          </div>
          <div>
            <label className="field-label">Note (optional)</label>
            <input className="field-input" value={awardForm.note} onChange={(e) => setAwardForm({ ...awardForm, note: e.target.value })} placeholder="e.g. 1st place, TechNova 2026" />
          </div>
          <button type="submit" disabled={awarding} className="btn-primary w-full">
            {awarding ? 'Awarding…' : 'Award points'}
          </button>
        </form>
      </div>
    </div>
  );
}
