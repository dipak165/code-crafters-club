import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { userAdminApi } from '../../services/admin.service';
import { useAuth } from '../../context/AuthContext';
import { TEAM_LABELS } from '../../utils/roles';

const ROLES = [
  'STUDENT', 'PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM',
  'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM', 'SUPER_ADMIN',
];

export default function ManageRoles() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const search = () => {
    setLoading(true);
    userAdminApi.search(query).then(({ data }) => setUsers(data)).catch(() => setUsers([])).finally(() => setLoading(false));
  };

  useEffect(search, []);

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === currentUser.id) {
      toast.error('You cannot change your own role — ask another Super Admin.');
      return;
    }
    setUpdatingId(targetUser.id);
    try {
      await userAdminApi.updateRole(targetUser.id, newRole);
      toast.success(`${targetUser.name}'s role updated to ${newRole.replace('_', ' ')}.`);
      search();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Super Admin</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Manage roles</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Search by name or email, then assign a role. You cannot change your own role — this is enforced by the backend, not just hidden here.
      </p>

      <div className="mt-6 flex gap-3">
        <input
          className="field-input"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button onClick={search} className="btn-secondary shrink-0">Search</button>
      </div>

      {loading && <p className="mt-6 font-mono text-sm text-ink-muted">$ loading…</p>}

      <div className="mt-6 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-raised/40 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{u.name} {u.id === currentUser.id && <span className="text-ink-faint">(you)</span>}</p>
              <p className="font-mono text-xs text-ink-faint">{u.email}</p>
            </div>
            <select
              value={u.role}
              onChange={(e) => handleRoleChange(u, e.target.value)}
              disabled={updatingId === u.id || u.id === currentUser.id}
              className="shrink-0 rounded-md border border-surface-border bg-surface px-2.5 py-1.5 font-mono text-xs text-ink disabled:opacity-50"
            >
              {ROLES.map((r) => <option key={r} value={r}>{TEAM_LABELS[r] || r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
