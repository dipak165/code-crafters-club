import { Link } from 'react-router-dom';

const CATEGORY_LABELS = {
  HACKATHON: 'Hackathon',
  WORKSHOP: 'Workshop',
  SEMINAR: 'Seminar',
  WEBDEV: 'Web Development',
  AI_ML: 'AI / ML',
  IOT_EMBEDDED: 'IoT & Embedded',
  PROJECT_EXHIBITION: 'Project Exhibition',
  GAMING: 'Gaming',
  PLACEMENT_PREP: 'Placement Prep',
  GUEST_LECTURE: 'Guest Lecture',
  TEAM_BUILDING: 'Team Building',
  TECH_FEST: 'Tech Fest',
  OTHER: 'Event',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventCard({ event }) {
  const isFull = event.seatsRemaining <= 0;
  const isPaid = Number(event.registrationFee) > 0;

  return (
    <Link
      to={`/events/${event.slug}`}
      className="card group flex flex-col overflow-hidden transition-colors hover:border-copper/50"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-raised">
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-xs text-ink-faint">no banner uploaded</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-surface-border bg-base/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-copper backdrop-blur">
          {CATEGORY_LABELS[event.category] || event.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-xs text-ink-faint">{formatDate(event.eventDate)} · {event.venue || event.mode}</p>
        <h3 className="mt-2 font-display text-lg font-semibold text-ink group-hover:text-copper">{event.title}</h3>

        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="font-mono text-sm text-signal-bright">{isPaid ? `₹${event.registrationFee}` : 'Free'}</span>
          <span className={`font-mono text-xs ${isFull ? 'text-danger' : 'text-active'}`}>
            {isFull ? 'Full — join waitlist' : `${event.seatsRemaining} seats left`}
          </span>
        </div>
      </div>
    </Link>
  );
}
