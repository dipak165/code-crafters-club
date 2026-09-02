import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { eventApi } from '../services/event.service';
import { registrationApi } from '../services/registration.service';
import { paymentApi } from '../services/payment.service';
import { loadRazorpayCheckout } from '../utils/loadRazorpay';
import { useAuth } from '../context/AuthContext';
import { canCreateEvents } from '../utils/roles';
import EventFeedback from '../components/events/EventFeedback';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function EventDetails() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | not-found
  const [registrationState, setRegistrationState] = useState(null); // null | 'registering' | 'CONFIRMED' | 'WAITLISTED'
  const [myRegistration, setMyRegistration] = useState(null); // { type: 'CONFIRMED' | 'WAITLISTED', code? }

  const loadEvent = () => {
    eventApi
      .getBySlug(slug)
      .then((res) => {
        setEvent(res.data);
        setStatus('ready');
      })
      .catch(() => setStatus('not-found'));
  };

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Once we know who's logged in, check whether they're already
  // registered/waitlisted for THIS event, so the button reflects
  // reality instead of always showing "Register Now".
  useEffect(() => {
    if (!user || !event) return;
    registrationApi
      .mine()
      .then(({ data }) => {
        const confirmed = data.registrations.find((r) => r.event.id === event.id && r.status === 'CONFIRMED');
        const waitlisted = data.waitlisted.find((w) => w.event.id === event.id);
        if (confirmed) setMyRegistration({ type: 'CONFIRMED', code: confirmed.registrationCode, attended: confirmed.attendanceStatus === 'PRESENT' });
        else if (waitlisted) setMyRegistration({ type: 'WAITLISTED', position: waitlisted.position });
        else setMyRegistration(null);
      })
      .catch(() => {});
  }, [user, event]);

  const handleRegister = async () => {
    setRegistrationState('registering');
    try {
      const res = await registrationApi.register(slug);
      toast.success(res.message);
      setMyRegistration(
        res.data.status === 'WAITLISTED'
          ? { type: 'WAITLISTED', position: res.data.position }
          : { type: 'CONFIRMED', code: res.data.registration?.registrationCode }
      );
      loadEvent(); // refresh seat count
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistrationState(null);
    }
  };

  const handleCancel = async () => {
    setRegistrationState('cancelling');
    try {
      await registrationApi.cancel(slug);
      toast.success('Registration cancelled.');
      setMyRegistration(null);
      loadEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel registration.');
    } finally {
      setRegistrationState(null);
    }
  };

  const handlePayment = async () => {
    setRegistrationState('paying');
    try {
      await loadRazorpayCheckout();
      const { data: order } = await paymentApi.createOrder(slug);

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Code Crafters Club',
        description: order.eventTitle,
        theme: { color: '#E8A33D' },
        prefill: { name: user.name, email: user.email, contact: user.phone },
        handler: async (response) => {
          try {
            // Backend independently re-verifies the HMAC signature —
            // this callback firing is NOT treated as proof of payment.
            await paymentApi.verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            toast.success('Payment verified — registration confirmed!');
            setMyRegistration({ type: 'CONFIRMED' });
            loadEvent();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed. Contact the club if money was deducted.');
          } finally {
            setRegistrationState(null);
          }
        },
        modal: {
          ondismiss: () => setRegistrationState(null),
        },
      });

      checkout.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setRegistrationState(null);
      });

      checkout.open();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not start payment.');
      setRegistrationState(null);
    }
  };

  if (status === 'loading') {
    return <div className="mx-auto max-w-4xl px-4 py-24 text-center font-mono text-sm text-ink-muted">$ loading event…</div>;
  }

  if (status === 'not-found') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <p className="font-mono text-sm text-danger">404 — event not found</p>
        <Link to="/events" className="mt-4 inline-block text-sm text-copper hover:text-copper-bright">← Back to events</Link>
      </div>
    );
  }

  const isPaid = Number(event.registrationFee) > 0;

const now = new Date();
const registrationStart = new Date(event.registrationStart);
const registrationDeadline = new Date(event.registrationDeadline);

const registrationOpen =
  event.status === 'REGISTRATION_OPEN' &&
  now >= registrationStart &&
  now <= registrationDeadline;

const registrationNotStarted = now < registrationStart;

const registrationEnded = now > registrationDeadline;

const isFull = event.seatsRemaining <= 0;
  const busy = ['registering', 'cancelling', 'paying'].includes(registrationState);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/events" className="text-sm text-ink-muted hover:text-copper">← All events</Link>
        {user && canCreateEvents(user.role) && (
          <Link to={`/admin/events/${slug}/edit`} className="text-xs text-copper hover:text-copper-bright">Edit event →</Link>
        )}
      </div>

      <div className="mt-5 aspect-[16/6] w-full overflow-hidden rounded-lg bg-surface-raised">
        {event.bannerUrl && <img src={event.bannerUrl} alt="" className="h-full w-full object-cover" />}
      </div>

      <p className="eyebrow mt-6 mb-2">{event.category.replace('_', ' ')}</p>
      <h1 className="font-display text-4xl font-semibold text-ink">{event.title}</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-border bg-surface p-5 font-mono text-xs sm:grid-cols-4">
        <Info label="date" value={formatDate(event.eventDate)} />
        <Info label="time" value={`${formatTime(event.startTime)} – ${formatTime(event.endTime)}`} />
        <Info label="venue" value={event.venue || event.mode} />
        <Info label="fee" value={isPaid ? `₹${event.registrationFee}` : 'Free'} />
      </div>

      <div className="prose prose-invert mt-8 max-w-none text-ink-muted">
        <p className="whitespace-pre-line leading-relaxed">{event.description}</p>
      </div>

      {event.eligibility && <Section title="Eligibility" body={event.eligibility} />}
      {event.rules && <Section title="Rules" body={event.rules} />}
      {event.prizeDetails && <Section title="Prizes" body={event.prizeDetails} />}
      {event.speaker && (
        <Section title="Speaker" body={`${event.speaker}${event.speakerDesignation ? ` — ${event.speakerDesignation}` : ''}`} />
      )}

      <div className="mt-10 border-t border-surface-border pt-8">
        {myRegistration ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className={`rounded-md px-4 py-2.5 font-mono text-sm ${myRegistration.type === 'CONFIRMED' ? 'bg-active/15 text-active' : 'bg-copper/15 text-copper'}`}>
              {myRegistration.type === 'CONFIRMED'
                ? `✓ Registered — ${myRegistration.code}`
                : `You're #${myRegistration.position} on the waitlist`}
            </span>
            <button onClick={handleCancel} disabled={busy} className="text-xs text-ink-muted hover:text-danger">
              {registrationState === 'cancelling' ? 'Cancelling…' : 'Cancel registration'}
            </button>
          </div>
       ) : registrationNotStarted ? (
  <span className="btn-secondary cursor-not-allowed opacity-60">
    Registration Not Open Yet
  </span>
) : registrationEnded ? (
  <span className="btn-secondary cursor-not-allowed opacity-60">
    Registration Closed
  </span>
) : event.status !== 'REGISTRATION_OPEN' ? (
  <span className="btn-secondary cursor-not-allowed opacity-60">
    Registration Closed
  </span>
) : !user ? (
          <Link to="/login" state={{ from: `/events/${slug}` }} className="btn-primary">
            Log in to register
          </Link>
        ) : isPaid ? (
          isFull ? (
            <span className="btn-secondary cursor-not-allowed opacity-60">Event Full</span>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={handlePayment} disabled={busy} className="btn-primary">
                {registrationState === 'paying' ? 'Opening payment…' : `Register — ₹${event.registrationFee}`}
              </button>
              <span className="font-mono text-xs text-ink-muted">
                {event.seatsRemaining} / {event.maxParticipants} seats remaining
              </span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-4">
            <button onClick={handleRegister} disabled={busy} className="btn-primary">
              {registrationState === 'registering' ? 'Registering…' : isFull ? 'Join Waitlist' : 'Register Now'}
            </button>
            <span className="font-mono text-xs text-ink-muted">
              {event.seatsRemaining} / {event.maxParticipants} seats remaining
            </span>
          </div>
        )}
      </div>

      <EventFeedback slug={slug} eventStatus={event.status} attended={myRegistration?.attended} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-ink-faint uppercase">{label}</p>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}

function Section({ title, body }) {
  return (
    <div className="mt-6">
      <h2 className="font-display text-lg font-semibold text-copper">{title}</h2>
      <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
