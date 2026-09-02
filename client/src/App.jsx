import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import RootLayout from './components/layout/RootLayout';
import ProtectedRoute from './routes/ProtectedRoute';

import Home from './pages/Home';
import About from './pages/About';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Team from './pages/Team';
import History from './pages/History';
import Recruitment from './pages/Recruitment';
import Leaderboard from './pages/Leaderboard';
import VerifyCertificate from './pages/VerifyCertificate';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin pages are lazy-loaded — recharts alone is a heavy dependency,
// and there's no reason a student browsing events should ever
// download it. Only fetched when someone actually navigates to /admin/*.
const AdminHome = lazy(() => import('./pages/admin/AdminHome'));
const CreateEvent = lazy(() => import('./pages/admin/CreateEvent'));
const EditEvent = lazy(() => import('./pages/admin/EditEvent'));
const CheckInScanner = lazy(() => import('./pages/admin/CheckInScanner'));
const ManageMembers = lazy(() => import('./pages/admin/ManageMembers'));
const ManageAnnouncements = lazy(() => import('./pages/admin/ManageAnnouncements'));
const ManageRecruitment = lazy(() => import('./pages/admin/ManageRecruitment'));
const ViewFeedback = lazy(() => import('./pages/admin/ViewFeedback'));
const ManageLeaderboard = lazy(() => import('./pages/admin/ManageLeaderboard'));
const ManageRoles = lazy(() => import('./pages/admin/ManageRoles'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));

function AdminFallback() {
  return <div className="mx-auto max-w-4xl px-4 py-24 text-center font-mono text-sm text-ink-muted">$ loading…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1A2233', color: '#E9ECF5', border: '1px solid #2A3348', fontSize: '13px' },
          }}
        />
        <Routes>
          <Route element={<RootLayout />}>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:slug" element={<EventDetails />} />
            <Route path="/team" element={<Team />} />
            <Route path="/history" element={<History />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            <Route path="/contact" element={<Contact />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><AdminHome /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/new"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><CreateEvent /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:slug/edit"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><EditEvent /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/checkin"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM', 'HOSPITALITY_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><CheckInScanner /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/members"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><ManageMembers /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'CONTENT_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><ManageAnnouncements /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/recruitment"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><ManageRecruitment /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute allowedRoles={['PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><ViewFeedback /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leaderboard"
              element={
                <ProtectedRoute allowedRoles={['TECHNICAL_TEAM', 'SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><ManageLeaderboard /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><ManageRoles /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <Suspense fallback={<AdminFallback />}><AuditLog /></Suspense>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
