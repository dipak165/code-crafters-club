export default function StarRating({ value, onChange, label }) {
  return (
    <div>
      {label && <p className="field-label">{label}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`text-2xl transition-colors ${n <= value ? 'text-copper' : 'text-surface-border hover:text-copper/50'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
