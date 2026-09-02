import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-copper text-sm">error 404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mt-3 text-sm text-ink-muted">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
