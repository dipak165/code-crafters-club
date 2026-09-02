export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">About</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Code Crafters Club</h1>
      <p className="mt-6 leading-relaxed text-ink-muted">
        Code Crafters Club is the official technical and non-technical student club of the
        ENTC department. Founded to give engineering students hands-on experience beyond the
        syllabus, we run hackathons, workshops, seminars, project exhibitions, and placement
        preparation sessions throughout the academic year.
      </p>
      <p className="mt-4 leading-relaxed text-ink-muted">
        Every event is planned, run, and delivered by student teams — Technical, Event
        Management, Hospitality, Content, and Marketing — giving members real ownership and
        real experience, not just attendance.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          ['Vision', 'A department where every student ships something real before graduating.'],
          ['Mission', 'Hands-on events, mentorship, and a certificate for every completed activity.'],
          ['Values', 'Ownership, craftsmanship, and learning by building — not just by watching.'],
        ].map(([title, body]) => (
          <div key={title} className="card p-5">
            <h3 className="font-display text-sm font-semibold text-copper">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
