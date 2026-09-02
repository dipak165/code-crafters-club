import { Link } from 'react-router-dom';
import LogoMark from '../../components/ui/LogoMark';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4 py-16">
      <Link to="/" className="mx-auto flex items-center gap-2.5">
        <LogoMark className="h-8 w-8" />
      </Link>
      <h1 className="mt-6 text-center font-display text-2xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-center text-sm text-ink-muted">{subtitle}</p>}

      <div className="card mt-8 p-6 sm:p-8">{children}</div>

      {footer && <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>}
    </div>
  );
}
