import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { announcementApi } from '../../services/announcement.service';

const emptyForm = { title: '', content: '', imageUrl: '', status: 'DRAFT' };

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    announcementApi.listAll().then(({ data }) => setAnnouncements(data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title, content: a.content, imageUrl: a.imageUrl || '', status: a.status });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('Title and content are required.');
    setSubmitting(true);
    try {
      if (editingId) {
        await announcementApi.update(editingId, form);
        toast.success('Announcement updated.');
      } else {
        await announcementApi.create(form);
        toast.success('Announcement saved.');
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement permanently?')) return;
    try {
      await announcementApi.remove(id);
      toast.success('Deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete.');
    }
  };

  const togglePublish = async (a) => {
    try {
      await announcementApi.update(a.id, { status: a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' });
      toast.success(a.status === 'PUBLISHED' ? 'Unpublished.' : 'Published.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Staff tool</p>
      <h1 className="font-display text-3xl font-semibold text-ink">Manage announcements</h1>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <h2 className="font-display text-sm font-semibold text-copper">{editingId ? 'Editing announcement' : 'New announcement'}</h2>

        <div>
          <label className="field-label">Title</label>
          <input className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Registration deadline extended" />
        </div>

        <div>
          <label className="field-label">Content</label>
          <textarea rows={4} className="field-input resize-none" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>

        <div>
          <label className="field-label">Image URL (optional)</label>
          <input className="field-input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
        </div>

        <div>
          <label className="field-label">Status</label>
          <select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft (not visible publicly)</option>
            <option value="PUBLISHED">Published (visible on homepage)</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create announcement'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>
          )}
        </div>
      </form>

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">All announcements</h2>

        {loading && <p className="mt-4 font-mono text-sm text-ink-muted">$ loading…</p>}
        {!loading && announcements.length === 0 && <p className="mt-4 font-mono text-sm text-ink-muted">No announcements yet.</p>}

        <div className="mt-4 space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-raised/40 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{a.title}</p>
                <p className="font-mono text-xs text-ink-faint">
                  {a.status === 'PUBLISHED' ? <span className="text-active">● published</span> : <span className="text-ink-faint">○ draft</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                <button onClick={() => togglePublish(a)} className="text-copper hover:text-copper-bright">
                  {a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => startEdit(a)} className="text-ink-muted hover:text-ink">Edit</button>
                <button onClick={() => handleDelete(a.id)} className="text-ink-muted hover:text-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
