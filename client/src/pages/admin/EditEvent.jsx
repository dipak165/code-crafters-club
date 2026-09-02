import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import EventForm from '../../components/admin/EventForm';
import { eventApi } from '../../services/event.service';

function toLocalInputValue(iso, dateOnly = false) {
  if (!iso) return '';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');

  const base = `${d.getFullYear()}-${pad(
    d.getMonth() + 1
  )}-${pad(d.getDate())}`;

  return dateOnly
    ? base
    : `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEvent() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setStatus('loading');

        const response = await eventApi.getBySlug(slug);

        setEvent(response.data);
        setStatus('ready');
      } catch (error) {
        console.error('Failed to load event:', error);
        setStatus('not-found');
      }
    };

    loadEvent();
  }, [slug]);

  const handleSubmit = async (values) => {
    if (!event?.id) {
      toast.error('Event ID is missing.');
      return;
    }

    setSubmitting(true);

    try {
      console.log('Updating event:', event.id);
      console.log('Update payload:', values);

      const response = await eventApi.update(event.id, values);

      toast.success('Event updated successfully.');

      navigate(`/events/${response.data.slug}`);
    } catch (err) {
      console.error(
        'UPDATE EVENT ERROR:',
        err.response?.data || err
      );

      toast.error(
        err.response?.data?.message ||
        'Could not update event.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-24 text-center font-mono text-sm text-ink-muted">
        $ loading…
      </p>
    );
  }

  if (status === 'not-found') {
    return (
      <p className="mx-auto max-w-2xl px-4 py-24 text-center font-mono text-sm text-danger">
        Event not found.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>

      <h1 className="font-display text-3xl font-semibold text-ink">
        Edit event
      </h1>

      <div className="card mt-8 p-6">
        <EventForm
          defaultValues={{
            ...event,

            bannerUrl: event.bannerUrl || '',
            venue: event.venue || '',
            meetingLink: event.meetingLink || '',
            eligibility: event.eligibility || '',
            rules: event.rules || '',
            prizeDetails: event.prizeDetails || '',
            speaker: event.speaker || '',
            speakerDesignation: event.speakerDesignation || '',

            registrationFee: Number(event.registrationFee || 0),

            eventDate: toLocalInputValue(
              event.eventDate,
              true
            ),

            startTime: toLocalInputValue(
              event.startTime
            ),

            endTime: toLocalInputValue(
              event.endTime
            ),

            registrationStart: toLocalInputValue(
              event.registrationStart
            ),

            registrationDeadline: toLocalInputValue(
              event.registrationDeadline,
              true
            ),
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}