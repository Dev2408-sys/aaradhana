export function EmptySalesIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="28" y="28" width="104" height="64" rx="10" fill="#0B1220" opacity="0.06" />
      <rect x="40" y="40" width="80" height="40" rx="6" stroke="#243049" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M52 56h24M52 66h16"
        stroke="#F97316"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="104" cy="60" r="10" stroke="#243049" strokeWidth="1.5" opacity="0.4" />
      <path d="M100 60h8M104 56v8" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
