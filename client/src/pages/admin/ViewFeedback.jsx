import { useEffect, useState } from 'react';
import { eventApi } from '../../services/event.service';
import { feedbackApi } from '../../services/feedback.service';

export default function ViewFeedback() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    eventApi.list({ upcoming: false, limit: 50 }).then((res) => setEvents(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventId) return setDetail(null);
    setLoading(true);
    feedbackApi.staffDetail(eventId).then(({ data }) => setDetail(data)).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Event feedback</h1>

      <select className="field-input mt-6" value={eventId} onChange={(e) => setEventId(e.target.value)}>
        <option value="">Select a completed event…</option>
        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
      </select>

      {loading && <p className="mt-6 font-mono text-sm text-ink-muted">$ loading…</p>}

      {!loading && detail && (
        <>
          <div className="card mt-6 p-5">
            {detail.summary.count === 0 ? (
              <p className="font-mono text-sm text-ink-muted">No feedback submitted for this event yet.</p>
            ) : (
              <div className="flex flex-wrap gap-6 font-mono text-sm">
                <Stat label="Overall" value={detail.summary.avgRating} />
                {detail.summary.avgSpeakerRating != null && <Stat label="Speaker" value={detail.summary.avgSpeakerRating} />}
                {detail.summary.avgOrganizationRating != null && <Stat label="Organization" value={detail.summary.avgOrganizationRating} />}
                <span className="text-ink-faint">{detail.summary.count} response{detail.summary.count !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {detail.entries.map((entry) => (
              <div key={entry.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{entry.user.name}</p>
                  <span className="font-mono text-xs text-copper">★ {entry.rating}</span>
                </div>
                {entry.comments && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{entry.comments}</p>}
                {entry.suggestions && (
                  <p className="mt-2 text-xs italic text-ink-faint">Suggestion: {entry.suggestions}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span>
      <span className="text-copper">★ {value}</span>
      <span className="ml-1.5 text-ink-faint">{label}</span>
    </span>
  );
}
