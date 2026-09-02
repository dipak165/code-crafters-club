import { Link } from 'react-router-dom';
import LogoMark from '../ui/LogoMark';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="font-display text-sm font-semibold text-ink">CODE CRAFTERS</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              The official technical club of the ENTC department — built by student
              engineers, for student engineers.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-3">Explore</p>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li><Link to="/events" className="hover:text-copper">Upcoming events</Link></li>
              <li><Link to="/history" className="hover:text-copper">Event history</Link></li>
              <li><Link to="/team" className="hover:text-copper">Our team</Link></li>
              <li><Link to="/leaderboard" className="hover:text-copper">Leaderboard</Link></li>
              <li><Link to="/verify-certificate" className="hover:text-copper">Verify certificate</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Get involved</p>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li><Link to="/register" className="hover:text-copper">Create an account</Link></li>
              <li><Link to="/recruitment" className="hover:text-copper">Join the club</Link></li>
              <li><Link to="/contact" className="hover:text-copper">Contact us</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Department</p>
            <p className="text-sm text-ink-muted">
              Electronics &amp; Telecommunication Engineering<br />
              XYZ College of Engineering
            </p>
            <p className="mt-3 font-mono text-xs text-ink-faint">codecraftersclub@college.edu</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-surface-border pt-6 text-xs text-ink-faint sm:flex-row">
          <p>© {new Date().getFullYear()} Code Crafters Club. All rights reserved.</p>
          <p className="font-mono">built by the technical team</p>
        </div>
      </div>
    </footer>
  );
}
