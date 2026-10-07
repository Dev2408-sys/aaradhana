export function SupportHelpIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="24" y="22" width="72" height="52" rx="14" fill="#0B1220" />
      <path d="M44 74l8-10h20l8 10" fill="#0B1220" />
      <circle cx="48" cy="48" r="4" fill="#F97316" />
      <circle cx="60" cy="48" r="4" fill="white" opacity="0.7" />
      <circle cx="72" cy="48" r="4" fill="white" opacity="0.4" />
    </svg>
  );
}
