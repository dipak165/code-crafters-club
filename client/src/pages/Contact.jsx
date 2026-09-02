import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Wired once POST /api/contact exists (Phase — Contact module).
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Message sent — we\'ll get back to you soon.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Get in touch</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Contact us</h1>
      <p className="mt-3 text-ink-muted">Questions about an event, membership, or partnership? Send us a note.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Name</label>
            <input required className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input required type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="field-label">Subject</label>
          <input required className="field-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Message</label>
          <textarea required rows={5} className="field-input resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
          {submitting ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}
