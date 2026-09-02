import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { feedbackApi } from '../../services/feedback.service';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../ui/StarRating';

// Self-contained: fetches its own data (public summary always, plus
// "have I already submitted" and eligibility checks only when logged
// in) so EventDetails.jsx doesn't need to carry this state.
export default function EventFeedback({ slug, eventStatus, attended }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [myFeedback, setMyFeedback] = useState(null);
  const [checkedEligibility, setCheckedEligibility] = useState(false);
  const [form, setForm] = useState({ rating: 0, speakerRating: 0, organizationRating: 0, comments: '', suggestions: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    feedbackApi.publicSummary(slug).then(({ data }) => setSummary(data)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!user) {
      setCheckedEligibility(true);
      return;
    }
    feedbackApi
      .mine(slug)
      .then(({ data }) => setMyFeedback(data))
      .catch(() => {})
      .finally(() => setCheckedEligibility(true));
  }, [user, slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rating === 0) return toast.error('Please give an overall rating.');
    setSubmitting(true);
    try {
      const { data } = await feedbackApi.submit(slug, {
        rating: form.rating,
        speakerRating: form.speakerRating || undefined,
        organizationRating: form.organizationRating || undefined,
        comments: form.comments || undefined,
        suggestions: form.suggestions || undefined,
      });
      setMyFeedback(data);
      toast.success('Thanks for your feedback!');
      feedbackApi.publicSummary(slug).then(({ data: s }) => setSummary(s)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // Only show the section at all once the event is meaningfully over
  // (or ongoing) — no point showing a feedback prompt for something
  // that hasn't happened yet.
  const eventHasHappened = ['ONGOING', 'COMPLETED'].includes(eventStatus);
  if (!eventHasHappened && !summary?.count) return null;

  return (
    <div className="mt-10 border-t border-surface-border pt-8">
      <h2 className="font-display text-lg font-semibold text-ink">Feedback</h2>

      {summary?.count > 0 && (
        <div className="mt-3 flex flex-wrap gap-6 font-mono text-sm">
          <Stat label="Overall" value={summary.avgRating} />
          {summary.avgSpeakerRating != null && <Stat label="Speaker" value={summary.avgSpeakerRating} />}
          {summary.avgOrganizationRating != null && <Stat label="Organization" value={summary.avgOrganizationRating} />}
          <span className="text-ink-faint">from {summary.count} response{summary.count !== 1 ? 's' : ''}</span>
        </div>
      )}
      {(!summary || summary.count === 0) && (
        <p className="mt-3 font-mono text-xs text-ink-faint">No feedback submitted yet.</p>
      )}

      {!checkedEligibility ? null : myFeedback ? (
        <p className="mt-5 rounded-md border border-active/30 bg-active/10 px-4 py-2.5 text-sm text-active">
          ✓ You've already submitted feedback for this event — thanks!
        </p>
      ) : eventHasHappened && attended ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 rounded-lg border border-surface-border bg-surface p-5">
          <StarRating label="Overall rating" value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
          <StarRating label="Speaker (optional)" value={form.speakerRating} onChange={(v) => setForm({ ...form, speakerRating: v })} />
          <StarRating label="Organization (optional)" value={form.organizationRating} onChange={(v) => setForm({ ...form, organizationRating: v })} />

          <div>
            <label className="field-label">Comments (optional)</label>
            <textarea rows={3} className="field-input resize-none" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Suggestions for next time (optional)</label>
            <textarea rows={2} className="field-input resize-none" value={form.suggestions} onChange={(e) => setForm({ ...form, suggestions: e.target.value })} />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </form>
      ) : null}
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
