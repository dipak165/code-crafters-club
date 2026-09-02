import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TEAM_LABELS, canCreateEvents, canManageAttendance } from '../utils/roles';
import { registrationApi } from '../services/registration.service';
import { certificateApi } from '../services/certificate.service';
import { notificationApi } from '../services/notification.service';
import EventPassModal from '../components/events/EventPassModal';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ registrations: [], waitlisted: [] });
  const [loading, setLoading] = useState(true);
  const [cancellingSlug, setCancellingSlug] = useState(null);
  const [passRegistration, setPassRegistration] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [downloadingCode, setDownloadingCode] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = () => {
    notificationApi.mine().then(({ data }) => setNotifications(data)).catch(() => {});
  };

  const load = () => {
    registrationApi
      .mine()
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    certificateApi.mine().then(({ data }) => setCertificates(data)).catch(() => {});
  }, []);

  useEffect(loadNotifications, []);

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readStatus: true } : n)));
    try {
      await notificationApi.markRead(id);
    } catch (err) {
      loadNotifications(); // revert on failure by re-syncing with the server
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
    try {
      await notificationApi.markAllRead();
    } catch (err) {
      loadNotifications();
    }
  };

  const handleDownload = async (code) => {
    setDownloadingCode(code);
    try {
      await certificateApi.download(code);
    } catch (err) {
      toast.error('Could not download certificate.');
    } finally {
      setDownloadingCode(null);
    }
  };

  const handleCancel = async (slug) => {
    setCancellingSlug(slug);
    try {
      await registrationApi.cancel(slug);
      toast.success('Registration cancelled.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel.');
    } finally {
      setCancellingSlug(null);
    }
  };

  const now = new Date();
  const upcoming = data.registrations.filter((r) => new Date(r.event.eventDate) >= now);
  const past = data.registrations.filter((r) => new Date(r.event.eventDate) < now);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow mb-2">{TEAM_LABELS[user.role]}</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Welcome, {user.name.split(' ')[0]}</h1>
      {!user.emailVerified && (
        <p className="mt-3 rounded-md border border-copper/30 bg-copper/10 px-4 py-2.5 text-sm text-copper">
          Your email isn't verified yet — some actions may be limited.
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <DashCard label="Registered events" value={loading ? '—' : data.registrations.length} hint="events you've signed up for" />
        <DashCard label="Certificates" value={certificates.length} hint="ready to download" />
        <DashCard label="Upcoming" value={loading ? '—' : upcoming.length} hint="events you're attending soon" />
        <DashCard label="Waitlisted" value={loading ? '—' : data.waitlisted.length} hint="pending a seat" />
        <DashCard label="Unread" value={notifications.filter((n) => !n.readStatus).length} hint="notifications" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink">My registrations</h2>

          {loading && <p className="mt-4 font-mono text-sm text-ink-muted">$ loading…</p>}

          {!loading && upcoming.length === 0 && data.waitlisted.length === 0 && (
            <p className="mt-4 font-mono text-sm text-ink-muted">
              No registrations yet. <Link to="/events" className="text-copper hover:text-copper-bright">Browse events →</Link>
            </p>
          )}

          <div className="mt-4 space-y-3">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-raised/40 px-4 py-3">
                <div>
                  <Link to={`/events/${r.event.slug}`} className="text-sm font-medium text-ink hover:text-copper">{r.event.title}</Link>
                  <p className="font-mono text-xs text-ink-faint">{formatDate(r.event.eventDate)} · {r.registrationCode}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {r.status === 'CONFIRMED' && (
                    <button onClick={() => setPassRegistration(r)} className="text-xs text-copper hover:text-copper-bright">
                      View Pass
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(r.event.slug)}
                    disabled={cancellingSlug === r.event.slug}
                    className="text-xs text-ink-muted hover:text-danger"
                  >
                    {cancellingSlug === r.event.slug ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              </div>
            ))}

            {data.waitlisted.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-4 rounded-md border border-copper/20 bg-copper/5 px-4 py-3">
                <div>
                  <Link to={`/events/${w.event.slug}`} className="text-sm font-medium text-ink hover:text-copper">{w.event.title}</Link>
                  <p className="font-mono text-xs text-copper">Waitlist position #{w.position}</p>
                </div>
                <button
                  onClick={() => handleCancel(w.event.slug)}
                  disabled={cancellingSlug === w.event.slug}
                  className="shrink-0 text-xs text-ink-muted hover:text-danger"
                >
                  Leave waitlist
                </button>
              </div>
            ))}
          </div>

          {!loading && past.length > 0 && (
            <p className="mt-4 font-mono text-xs text-ink-faint">{past.length} past event{past.length !== 1 ? 's' : ''} — see full history soon.</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Quick links</h2>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link to="/events" className="text-ink-muted hover:text-copper">Browse events</Link>
            <Link to="/team" className="text-ink-muted hover:text-copper">Club members by year</Link>
            <Link to="/verify-certificate" className="text-ink-muted hover:text-copper">Verify a certificate</Link>
            {['PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'SUPER_ADMIN'].includes(user.role) && (
              <Link to="/admin" className="text-copper hover:text-copper-bright">→ Admin dashboard</Link>
            )}
            {canCreateEvents(user.role) && (
              <Link to="/admin/events/new" className="text-copper hover:text-copper-bright">+ Create an event</Link>
            )}
            {canManageAttendance(user.role) && (
              <Link to="/admin/checkin" className="text-copper hover:text-copper-bright">→ Event check-in scanner</Link>
            )}
            {['TECHNICAL_TEAM', 'CONTENT_TEAM', 'SUPER_ADMIN'].includes(user.role) && (
              <Link to="/admin/announcements" className="text-copper hover:text-copper-bright">→ Manage announcements</Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <h2 className="font-display text-lg font-semibold text-ink">My certificates</h2>

        {certificates.length === 0 && (
          <p className="mt-4 font-mono text-sm text-ink-muted">
            No certificates yet — these appear automatically once you're checked in at an event and the club issues them.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {certificates.map((cert) => (
            <div key={cert.id} className="flex items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-raised/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{cert.event.title}</p>
                <p className="font-mono text-xs text-ink-faint">{cert.certificateCode}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  onClick={() => handleDownload(cert.certificateCode)}
                  disabled={downloadingCode === cert.certificateCode}
                  className="text-xs text-copper hover:text-copper-bright"
                >
                  {downloadingCode === cert.certificateCode ? 'Downloading…' : 'Download'}
                </button>
                <Link to={`/verify-certificate?code=${cert.certificateCode}`} className="text-xs text-ink-faint hover:text-ink-muted">
                  Verify
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Notifications</h2>
          {notifications.some((n) => !n.readStatus) && (
            <button onClick={handleMarkAllRead} className="text-xs text-copper hover:text-copper-bright">Mark all read</button>
          )}
        </div>

        {notifications.length === 0 && (
          <p className="mt-4 font-mono text-sm text-ink-muted">No notifications yet.</p>
        )}

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.readStatus && handleMarkRead(n.id)}
              className={`block w-full rounded-md border px-4 py-3 text-left transition-colors ${
                n.readStatus
                  ? 'border-surface-border bg-surface-raised/20 text-ink-muted'
                  : 'border-copper/30 bg-copper/5 text-ink hover:border-copper/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.readStatus && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-copper" />}
              </div>
              <p className="mt-1 text-xs text-ink-muted">{n.message}</p>
              <p className="mt-1 font-mono text-[10px] text-ink-faint">
                {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </button>
          ))}
        </div>
      </div>

      <EventPassModal registration={passRegistration} onClose={() => setPassRegistration(null)} />
    </div>
  );
}

function DashCard({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-2xl font-medium text-copper">{value}</p>
      <p className="mt-1 text-sm text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>
    </div>
  );
}
