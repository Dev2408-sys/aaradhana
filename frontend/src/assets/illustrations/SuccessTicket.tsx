export function SuccessTicketIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Booking submitted"
    >
      <rect x="30" y="28" width="140" height="84" rx="12" fill="#0B1220" />
      <rect x="30" y="28" width="8" height="84" rx="2" fill="#F97316" />
      <circle cx="30" cy="56" r="7" fill="#F1F3F6" />
      <circle cx="30" cy="84" r="7" fill="#F1F3F6" />
      <path
        d="M52 52h70M52 64h48M52 76h36"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="148" cy="70" r="18" fill="#F97316" />
      <path
        d="M140 70l5.5 5.5L157 64"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="20" r="3" fill="#F97316" opacity="0.5" />
      <circle cx="160" cy="24" r="2.5" fill="#EA580C" opacity="0.45" />
      <circle cx="170" cy="110" r="3" fill="#F97316" opacity="0.35" />
    </svg>
  );
}
