import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { memberApi } from '../services/member.service';
import { TEAM_LABELS } from '../utils/roles';
import { useAuth } from '../context/AuthContext';

const TEAM_ORDER = [
  'PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM',
  'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM',
];

export default function Team() {
  const { user } = useAuth();
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberApi.years().then(({ data }) => {
      setYears(data);
      if (data.length > 0) setYear(data[0]);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!year) return;
    setLoading(true);
    memberApi.byYear(year).then(({ data }) => setMembers(data.members)).catch(() => setMembers([])).finally(() => setLoading(false));
  }, [year]);

  const grouped = TEAM_ORDER.map((team) => ({
    team,
    people: members.filter((m) => m.team === team),
  })).filter((g) => g.people.length > 0);

  const canManage = user && (user.role === 'TECHNICAL_TEAM' || user.role === 'SUPER_ADMIN');

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Our team</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">
          Club members{year ? ` — ${year}` : ''}
        </h1>
        <div className="flex items-center gap-3">
          {years.length > 0 && (
            <div className="flex gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`rounded-md px-3.5 py-1.5 font-mono text-sm transition-colors ${
                    y === year ? 'bg-copper text-base' : 'border border-surface-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
          {canManage && (
            <Link to="/admin/members" className="text-xs text-copper hover:text-copper-bright">
              Manage members →
            </Link>
          )}
        </div>
      </div>

      {loading && <p className="mt-10 font-mono text-sm text-ink-muted">$ loading roster…</p>}

      {!loading && years.length === 0 && (
        <div className="card mt-10 flex flex-col items-center gap-2 py-20 text-center">
          <p className="font-mono text-sm text-ink-muted">No club years have been set up yet.</p>
          {canManage && (
            <Link to="/admin/members" className="text-xs text-copper hover:text-copper-bright">Add the first member →</Link>
          )}
        </div>
      )}

      {!loading && years.length > 0 && grouped.length === 0 && (
        <div className="card mt-10 flex flex-col items-center gap-2 py-20 text-center">
          <p className="font-mono text-sm text-ink-muted">No members listed for {year} yet.</p>
        </div>
      )}

      <div className="mt-10 space-y-10">
        {grouped.map(({ team, people }) => (
          <div key={team}>
            <h2 className="font-display text-lg font-semibold text-copper">{TEAM_LABELS[team]}</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <div key={person.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-raised">
                      {person.profileImage && <img src={person.profileImage} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-medium text-ink">{person.name}</p>
                      <p className="text-xs text-ink-muted">{person.position}</p>
                    </div>
                  </div>

                  {person.description && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{person.description}</p>}

                  {person.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {person.skills.map((s) => (
                        <span key={s} className="rounded-full border border-surface-border px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-3 text-xs">
                    {person.githubUrl && <a href={person.githubUrl} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-copper">GitHub</a>}
                    {person.linkedinUrl && <a href={person.linkedinUrl} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-copper">LinkedIn</a>}
                    {person.portfolioUrl && <a href={person.portfolioUrl} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-copper">Portfolio</a>}
                    {person.cvUrl && (
                      <button onClick={() => memberApi.downloadCv(person.id, person.name)} className="text-copper hover:text-copper-bright">
                        CV
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
