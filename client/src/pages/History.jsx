export default function History() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Looking back</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Event history</h1>
      <p className="mt-3 max-w-xl text-ink-muted">Past events, galleries, and winners — filterable by year, once the Event History module (Phase 6 extension) is connected.</p>

      <div className="card mt-10 flex flex-col items-center gap-2 py-20 text-center">
        <p className="font-mono text-sm text-ink-muted">No completed events indexed yet.</p>
        <p className="text-xs text-ink-faint">Completed events will appear here automatically as they wrap up.</p>
      </div>
    </div>
  );
}
