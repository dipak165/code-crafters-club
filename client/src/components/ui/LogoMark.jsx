// Logo mark: an IC-chip outline with pin leads, rendered in the
// copper accent — grounds the brand in the ENTC/electronics
// identity instead of a generic circular letter-mark.
export default function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="10" y="10" width="20" height="20" rx="2" fill="none" stroke="#E8A33D" strokeWidth="1.75" />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="11"
        fontWeight="600"
        fill="#E8A33D"
      >
        CC
      </text>
      {/* pin leads */}
      {[13, 20, 27].map((x) => (
        <line key={`t-${x}`} x1={x} y1="4" x2={x} y2="10" stroke="#5B7FFF" strokeWidth="1.5" />
      ))}
      {[13, 20, 27].map((x) => (
        <line key={`b-${x}`} x1={x} y1="30" x2={x} y2="36" stroke="#5B7FFF" strokeWidth="1.5" />
      ))}
      {[13, 20, 27].map((y) => (
        <line key={`l-${y}`} x1="4" y1={y} x2="10" y2={y} stroke="#5B7FFF" strokeWidth="1.5" />
      ))}
      {[13, 20, 27].map((y) => (
        <line key={`r-${y}`} x1="30" y1={y} x2="36" y2={y} stroke="#5B7FFF" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
