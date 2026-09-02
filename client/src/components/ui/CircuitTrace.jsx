// The signature element of this design: a copper PCB trace that
// routes between sections like an actual circuit connection,
// literalizing "Code Crafters Club" (code) + ENTC (circuits).
// Draws itself in on mount via stroke-dashoffset animation.
export default function CircuitTrace({ className = '', variant = 'horizontal' }) {
  if (variant === 'vertical') {
    return (
      <svg
        viewBox="0 0 40 320"
        className={className}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 0 L20 60 L8 78 L8 140 L20 158 L20 220 L32 238 L32 320"
          stroke="url(#trace-grad-v)"
          strokeWidth="2"
          strokeDasharray="400"
          strokeDashoffset="400"
          className="animate-dash"
        />
        {[60, 140, 220].map((cy, i) => (
          <circle key={i} cx={cy === 60 ? 8 : cy === 220 ? 32 : 8} cy={cy} r="3" fill="#E8A33D" className="animate-pulseDot" />
        ))}
        <defs>
          <linearGradient id="trace-grad-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B7FFF" />
            <stop offset="100%" stopColor="#E8A33D" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 640 40" className={className} fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M0 20 L200 20 L220 8 L420 8 L440 20 L640 20"
        stroke="url(#trace-grad-h)"
        strokeWidth="2"
        strokeDasharray="900"
        strokeDashoffset="900"
        className="animate-dash"
      />
      <circle cx="220" cy="8" r="3" fill="#E8A33D" className="animate-pulseDot" />
      <circle cx="440" cy="20" r="3" fill="#5B7FFF" className="animate-pulseDot" style={{ animationDelay: '0.6s' }} />
      <defs>
        <linearGradient id="trace-grad-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5B7FFF" />
          <stop offset="100%" stopColor="#E8A33D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
