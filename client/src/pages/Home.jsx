import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '../services/event.service';
import { announcementApi } from '../services/announcement.service';
import CircuitTrace from '../components/ui/CircuitTrace';
import EventCard from '../components/events/EventCard';

const FALLBACK_STATS = { students: 500, events: 50, workshops: 20, certificates: 100, hackathons: 10 };

export default function Home() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    eventApi.stats().then((res) => setStats(res.data)).catch(() => {});
    eventApi
      .list({ upcoming: true, limit: 3 })
      .then((res) => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
    announcementApi.list(3).then((res) => setAnnouncements(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden border-b border-surface-border">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8">
          <p className="eyebrow mb-5">ENTC Department · Student-run since 2023</p>
          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            CODE. CREATE.
            <br />
            <span className="text-copper">INNOVATE.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Empowering students through technology, innovation, collaboration and
            hands-on learning — one hackathon, workshop and late-night build session
            at a time.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link to="/events" className="btn-primary text-sm">
              Explore Events
            </Link>
            <Link to="/register" className="btn-secondary text-sm">
              Join Code Crafters Club
            </Link>
          </div>
        </div>

        <CircuitTrace className="h-10 w-full text-copper" />
      </section>

      {/* ---------------- LIVE STATS (terminal panel) ---------------- */}
      <section className="border-b border-surface-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-surface-border bg-surface-raised px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-copper/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-active/70" />
              <span className="ml-3 font-mono text-xs text-ink-faint">ccc@club:~$ ./club-stats --live</span>
            </div>
            <div className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-5 sm:p-8">
              <Stat value={stats.students} label="students" suffix="+" />
              <Stat value={stats.events} label="events run" suffix="+" />
              <Stat value={stats.workshops} label="workshops" suffix="+" />
              <Stat value={stats.hackathons} label="hackathons" suffix="+" />
              <Stat value={stats.certificates} label="certificates issued" suffix="+" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ANNOUNCEMENTS ---------------- */}
      {announcements.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Club news</p>
              <h2 className="font-display text-3xl font-semibold text-ink">Latest announcements</h2>
            </div>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {announcements.map((a) => (
              <div key={a.id} className="card overflow-hidden">
                {a.imageUrl && (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-surface-raised">
                    <img src={a.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <p className="font-mono text-xs text-ink-faint">
                    {new Date(a.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <h3 className="mt-2 font-display text-base font-semibold text-ink">{a.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{a.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- ABOUT ---------------- */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow mb-4">About the club</p>
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              A club built on the same principle as good circuit design:
              <span className="text-copper"> every connection matters.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-ink-muted">
              Code Crafters Club is the technical student body of the ENTC
              department. We run coding competitions, hackathons, workshops,
              AI/ML and IoT sessions, project exhibitions, and placement-prep
              drives — all organized and delivered by students, for students.
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">
              Our mission is simple: give every member hands-on experience they
              can't get from a syllabus, and a portfolio of real, certified work
              by the time they graduate.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/about" className="btn-secondary text-sm">Read our full story</Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Vision', body: 'A department where every student engineer ships something real before they graduate.' },
              { title: 'Mission', body: 'Hands-on technical events, mentorship, and a portfolio-worthy certificate for every completed activity.' },
              { title: 'What you learn', body: 'Full-stack dev, embedded systems, AI/ML, competitive programming, and how to actually ship a project.' },
              { title: 'Why join', body: 'Real teams (technical, events, content, marketing) — build your resume by running things, not just attending them.' },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <h3 className="font-display text-sm font-semibold text-copper">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- UPCOMING EVENTS ---------------- */}
      <section className="border-t border-surface-border bg-surface/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">What's next</p>
              <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Upcoming events</h2>
            </div>
            <Link to="/events" className="text-sm font-medium text-copper hover:text-copper-bright">
              View all events →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingEvents &&
              [1, 2, 3].map((i) => (
                <div key={i} className="card h-72 animate-pulse bg-surface-raised/40" />
              ))}

            {!loadingEvents && events.length === 0 && (
              <div className="card col-span-full flex flex-col items-center justify-center gap-2 py-16 text-center">
                <p className="font-mono text-sm text-ink-muted">No upcoming events scheduled right now.</p>
                <p className="text-xs text-ink-faint">Check back soon, or view past events in our history.</p>
              </div>
            )}

            {!loadingEvents && events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, suffix }) {
  return (
    <div>
      <p className="font-mono text-3xl font-medium text-copper sm:text-4xl">
        {value}
        <span className="text-signal">{suffix}</span>
      </p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}
