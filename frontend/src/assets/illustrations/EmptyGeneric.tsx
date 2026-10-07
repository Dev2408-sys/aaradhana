export function EmptyGenericIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="70" cy="48" r="36" stroke="#243049" strokeWidth="1.25" opacity="0.2" />
      <circle cx="70" cy="48" r="22" stroke="#F97316" strokeWidth="1.5" opacity="0.45" />
      <circle cx="70" cy="48" r="6" fill="#F97316" opacity="0.7" />
      <circle cx="70" cy="18" r="2" fill="#243049" opacity="0.25" />
      <circle cx="100" cy="48" r="2" fill="#243049" opacity="0.25" />
      <circle cx="70" cy="78" r="2" fill="#243049" opacity="0.25" />
      <circle cx="40" cy="48" r="2" fill="#243049" opacity="0.25" />
    </svg>
  );
}
