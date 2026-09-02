import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsApi } from '../../services/analytics.service';
import { useAuth } from '../../context/AuthContext';
import { canCreateEvents, canManageAttendance } from '../../utils/roles';

const CATEGORY_LABELS = {
  HACKATHON: 'Hackathon', WORKSHOP: 'Workshop', SEMINAR: 'Seminar', WEBDEV: 'Web Dev',
  AI_ML: 'AI/ML', IOT_EMBEDDED: 'IoT', PROJECT_EXHIBITION: 'Exhibition', GAMING: 'Gaming',
  PLACEMENT_PREP: 'Placement', GUEST_LECTURE: 'Guest Lecture', TEAM_BUILDING: 'Team Building',
  TECH_FEST: 'Tech Fest', OTHER: 'Other',
};

const PIE_COLORS = ['#E8A33D', '#5B7FFF', '#2DD4BF', '#F2545B', '#FFC069', '#8AA0FF', '#8D96AC'];

const CHART_TOOLTIP_STYLE = {
  background: '#1A2233',
  border: '1px solid #2A3348',
  borderRadius: 6,
  fontSize: 12,
  color: '#E9ECF5',
};

export default function AdminHome() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [regByMonth, setRegByMonth] = useState([]);
  const [eventsByCategory, setEventsByCategory] = useState([]);
  const [revenueByEvent, setRevenueByEvent] = useState([]);
  const [studentsByYear, setStudentsByYear] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.overview(),
      analyticsApi.registrationsByMonth(6),
      analyticsApi.eventsByCategory(),
      analyticsApi.revenueByEvent(),
      analyticsApi.studentsByGraduationYear(),
    ])
      .then(([ov, reg, cat, rev, stu]) => {
        setOverview(ov.data);
        setRegByMonth(reg.data);
        setEventsByCategory(cat.data.map((c) => ({ ...c, category: CATEGORY_LABELS[c.category] || c.category })));
        setRevenueByEvent(rev.data);
        setStudentsByYear(stu.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Staff dashboard</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Club overview</h1>
        </div>
        <div className="flex gap-3">
          {canCreateEvents(user.role) && (
            <Link to="/admin/events/new" className="btn-primary text-sm">+ New event</Link>
          )}
          {canManageAttendance(user.role) && (
            <Link to="/admin/checkin" className="btn-secondary text-sm">Check-in scanner</Link>
          )}
          {(user.role === 'TECHNICAL_TEAM' || user.role === 'SUPER_ADMIN') && (
            <Link to="/admin/members" className="btn-secondary text-sm">Manage members</Link>
          )}
          {(user.role === 'TECHNICAL_TEAM' || user.role === 'SUPER_ADMIN') && (
            <Link to="/admin/recruitment" className="btn-secondary text-sm">Recruitment</Link>
          )}
          <Link to="/admin/feedback" className="btn-secondary text-sm">Feedback</Link>
          {(user.role === 'TECHNICAL_TEAM' || user.role === 'SUPER_ADMIN') && (
            <Link to="/admin/leaderboard" className="btn-secondary text-sm">Leaderboard settings</Link>
          )}
          {user.role === 'SUPER_ADMIN' && (
            <>
              <Link to="/admin/roles" className="btn-secondary text-sm">Manage roles</Link>
              <Link to="/admin/audit-log" className="btn-secondary text-sm">Audit log</Link>
            </>
          )}
          {['TECHNICAL_TEAM', 'CONTENT_TEAM', 'SUPER_ADMIN'].includes(user.role) && (
            <Link to="/admin/announcements" className="btn-secondary text-sm">Announcements</Link>
          )}
        </div>
      </div>

      {loading && <p className="mt-10 font-mono text-sm text-ink-muted">$ loading analytics…</p>}

      {!loading && overview && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Students" value={overview.totalStudents} />
            <StatCard label="Total events" value={overview.totalEvents} />
            <StatCard label="Upcoming" value={overview.upcomingEvents} />
            <StatCard label="Completed" value={overview.completedEvents} />
            <StatCard label="Registrations" value={overview.totalRegistrations} />
            <StatCard label="Revenue" value={`₹${overview.totalRevenue.toLocaleString('en-IN')}`} />
            <StatCard label="Certificates issued" value={overview.certificatesIssued} />
            <StatCard label="Current members" value={overview.currentClubMembers} />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Registrations per month">
              {regByMonth.every((b) => b.count === 0) ? (
                <EmptyChart label="No registrations yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={regByMonth}>
                    <CartesianGrid stroke="#2A3348" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#8D96AC" fontSize={11} />
                    <YAxis stroke="#8D96AC" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(232,163,61,0.06)' }} />
                    <Bar dataKey="count" fill="#E8A33D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Events by category">
              {eventsByCategory.length === 0 ? (
                <EmptyChart label="No events yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={eventsByCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#5C6478', strokeWidth: 1 }}
                    >
                      {eventsByCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#8D96AC' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Revenue by event (top 10)">
              {revenueByEvent.length === 0 ? (
                <EmptyChart label="No paid registrations yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByEvent} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid stroke="#2A3348" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="#8D96AC" fontSize={11} />
                    <YAxis type="category" dataKey="eventTitle" stroke="#8D96AC" fontSize={11} width={120} tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`₹${v}`, 'Revenue']} cursor={{ fill: 'rgba(91,127,255,0.06)' }} />
                    <Bar dataKey="revenue" fill="#5B7FFF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Students by graduation year">
              {studentsByYear.length === 0 ? (
                <EmptyChart label="No students registered yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={studentsByYear}>
                    <CartesianGrid stroke="#2A3348" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" stroke="#8D96AC" fontSize={11} />
                    <YAxis stroke="#8D96AC" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(45,212,191,0.06)' }} />
                    <Bar dataKey="count" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-2xl font-medium text-copper">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card p-5">
      <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="flex h-[260px] items-center justify-center">
      <p className="font-mono text-xs text-ink-faint">{label}</p>
    </div>
  );
}
