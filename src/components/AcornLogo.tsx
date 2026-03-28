type AcornLogoProps = {
  compact?: boolean;
};

export function AcornLogo({ compact = false }: AcornLogoProps) {
  return (
    <div className={`acorn-logo ${compact ? "acorn-logo--compact" : ""}`}>
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="18" fill="currentColor" opacity="0.08" />
        <path
          d="M26.2 18.4c1.9-2.7 4.7-4.3 7.7-4.3 2.9 0 5.7 1.6 7.6 4.3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.2"
          opacity="0.58"
        />
        <path
          d="M20.8 25c0-1.5 1.2-2.7 2.7-2.7h17c1.5 0 2.7 1.2 2.7 2.7 0 8.9-3.4 16.1-8.2 21-2.4 2.4-5.2 3.7-6.9 3.7s-4.5-1.3-6.9-3.7c-4.9-4.9-8.4-12.1-8.4-21Z"
          fill="#A86C3C"
          stroke="#3B2415"
          strokeWidth="1.2"
        />
        <path d="M24.6 24.8c4.8-3.2 14-3.2 18.8 0" stroke="#F6E9D2" strokeLinecap="round" strokeWidth="1.8" opacity="0.92" />
        <path d="M32 10.2c.6-2.7 2.2-4.8 4.8-6.2" stroke="#5B7B4E" strokeLinecap="round" strokeWidth="2" />
      </svg>
      <span>Acorn</span>
    </div>
  );
}
