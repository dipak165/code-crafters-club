import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '../services/event.service';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  ['', 'All categories'],
  ['HACKATHON', 'Hackathon'],
  ['WORKSHOP', 'Workshop'],
  ['SEMINAR', 'Seminar'],
  ['WEBDEV', 'Web Development'],
  ['AI_ML', 'AI / ML'],
  ['IOT_EMBEDDED', 'IoT & Embedded'],
  ['PROJECT_EXHIBITION', 'Project Exhibition'],
  ['GAMING', 'Gaming'],
  ['PLACEMENT_PREP', 'Placement Prep'],
  ['GUEST_LECTURE', 'Guest Lecture'],
  ['TEAM_BUILDING', 'Team Building'],
  ['TECH_FEST', 'Tech Fest'],
  ['OTHER', 'Other'],
];

export default function Events() {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });

  // Roles allowed to create events
  const canCreateEvent =
    user &&
    [
      'TECHNICAL_TEAM',
      'SUPER_ADMIN',
    ].includes(user.role);

  useEffect(() => {
    setLoading(true);

    eventApi
      .list({
        upcoming: true,
        category: category || undefined,
        search: search || undefined,
        page,
        limit: 9,
      })
      .then((res) => {
        setEvents(res.data);
        setMeta(res.meta);
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [category, search, page]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

        <div>
          <p className="eyebrow mb-3">Browse</p>

          <h1 className="font-display text-4xl font-semibold text-ink">
            Upcoming events
          </h1>

          <p className="mt-3 max-w-xl text-ink-muted">
            Coding competitions, hackathons, workshops and more —
            register directly, pay online if the event is paid,
            and get your e-certificate automatically.
          </p>
        </div>

        {/* Create Event Button */}
        {canCreateEvent && (
          <Link
  to="/admin/events/new"
  className="btn-primary whitespace-nowrap"
>
  + Create Event
</Link>
        )}

      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">

        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="field-input sm:max-w-xs"
        />

        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="field-input sm:max-w-xs"
        >
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

      </div>

      {/* Events */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card h-72 animate-pulse bg-surface-raised/40"
            />
          ))}

        {!loading && events.length === 0 && (
          <div className="card col-span-full flex flex-col items-center gap-2 py-16 text-center">

            <p className="font-mono text-sm text-ink-muted">
              No events match your filters.
            </p>

            <button
              onClick={() => {
                setCategory('');
                setSearch('');
              }}
              className="text-xs text-copper hover:text-copper-bright"
            >
              Clear filters
            </button>

          </div>
        )}

        {!loading &&
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
            />
          ))}

      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3 font-mono text-sm">

          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-30"
          >
            ← prev
          </button>

          <span className="text-ink-muted">
            page {page} / {meta.totalPages}
          </span>

          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-30"
          >
            next →
          </button>

        </div>
      )}

    </div>
  );
}