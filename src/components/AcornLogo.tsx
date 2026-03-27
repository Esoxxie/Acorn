type AcornLogoProps = {
  compact?: boolean;
};

export function AcornLogo({ compact = false }: AcornLogoProps) {
  return (
    <div className={`acorn-logo ${compact ? "acorn-logo--compact" : ""}`}>
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="20" fill="currentColor" opacity="0.1" />
        <path
          d="M32 13c6.3 0 12 3.2 14.8 8.4 1.2 2.1-.1 4.6-2.6 4.6H19.8c-2.5 0-3.8-2.5-2.6-4.6C20 16.2 25.7 13 32 13Z"
          fill="currentColor"
        />
        <path
          d="M22.4 25.5c0-1.3 1.1-2.4 2.4-2.4h14.5c1.3 0 2.4 1.1 2.4 2.4 0 8.1-2.3 14.5-5.8 18.4-1.9 2.2-4.3 3.4-5.9 3.4s-4-1.2-5.9-3.4c-3.4-4-5.7-10.3-5.7-18.4Z"
          fill="#b56d3f"
        />
        <path d="M30.5 13c0-3.5 2.2-7 5.8-9.1" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
        <path d="M18.8 24.4c5 4 21.3 4 26.4 0" stroke="#3a2617" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
      <span>Acorn</span>
    </div>
  );
}
