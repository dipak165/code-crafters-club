import { useEffect, useState } from 'react';
import { leaderboardApi } from '../services/leaderboard.service';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [contributors, setContributors] = useState([]);
  const [myStanding, setMyStanding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardApi.top(20).then(({ data }) => setContributors(data)).catch(() => {}).finally(() => setLoading(false));
    if (user) leaderboardApi.mine().then(({ data }) => setMyStanding(data)).catch(() => {});
  }, [user]);

  const podium = contributors.slice(0, 3);
  const rest = contributors.slice(3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Top contributors</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Club leaderboard</h1>
      <p className="mt-3 text-ink-muted">
        Points are earned by attending events, completing certificates, winning competitions, and volunteering with the club.
      </p>

      {user && myStanding && (
        <div className="card mt-6 flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-ink-muted">Your standing</p>
            <p className="font-mono text-2xl font-medium text-copper">{myStanding.totalPoints} pts</p>
          </div>
          {myStanding.rank && <p className="font-mono text-sm text-ink-muted">rank #{myStanding.rank}</p>}
        </div>
      )}

      {loading && <p className="mt-10 font-mono text-sm text-ink-muted">$ loading…</p>}

      {!loading && contributors.length === 0 && (
        <div className="card mt-10 flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-mono text-sm text-ink-muted">No points awarded yet.</p>
          <p className="text-xs text-ink-faint">Attend an event and get checked in to start earning points.</p>
        </div>
      )}

      {podium.length > 0 && (
        <div className="mt-10 grid grid-cols-3 items-end gap-3">
          {[podium[1], podium[0], podium[2]].map((p, i) =>
            p ? <PodiumSpot key={p.userId} person={p} height={i === 1 ? 'h-32' : i === 0 ? 'h-24' : 'h-20'} /> : <div key={i} />
          )}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-8 space-y-2">
          {rest.map((p) => (
            <div key={p.userId} className="flex items-center justify-between rounded-md border border-surface-border bg-surface-raised/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-ink-faint">#{p.rank}</span>
                <span className="text-sm text-ink">{p.name}</span>
              </div>
              <span className="font-mono text-sm text-copper">{p.totalPoints} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PodiumSpot({ person, height }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-medium text-ink">{person.name}</p>
      <p className="font-mono text-xs text-copper">{person.totalPoints} pts</p>
      <div className={`mt-3 flex w-full ${height} items-start justify-center rounded-t-lg border border-surface-border bg-surface-raised pt-2`}>
        <span className="font-display text-lg font-semibold text-copper">#{person.rank}</span>
      </div>
    </div>
  );
}
