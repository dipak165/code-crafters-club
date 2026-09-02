import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EventForm from '../../components/admin/EventForm';
import { eventApi } from '../../services/event.service';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await eventApi.create(values);
      toast.success('Event created.');
      navigate(`/events/${data.slug}`);
    } catch (err) {
  console.error('========== CREATE EVENT ERROR ==========');
  console.error('STATUS:', err.response?.status);
  console.error('DATA:', err.response?.data);
  console.error('FULL ERROR:', err);
  
  toast.error(
    err.response?.data?.message ||
    'Could not create event.'
  );
} finally {
  setSubmitting(false);
}
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Create an event</h1>
      <div className="card mt-8 p-6">
        <EventForm
          defaultValues={{
            category: 'WORKSHOP', mode: 'OFFLINE', status: 'DRAFT',
            certificateEnabled: true, registrationFee: 0, maxParticipants: 50,
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Create event"
        />
      </div>
    </div>
  );
}
