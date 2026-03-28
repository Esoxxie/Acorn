type AcornLogoProps = {
  compact?: boolean;
};

export function AcornLogo({ compact = false }: AcornLogoProps) {
  return (
    <div className={`acorn-logo ${compact ? "acorn-logo--compact" : ""}`}>
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <path
          d="M16 4c.4-1.6 1.4-2.8 3-3.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
          opacity="0.5"
        />
        <path
          d="M10 11.5C10 10.7 10.7 10 11.5 10h9c.8 0 1.5.7 1.5 1.5 0 5-2 9.2-4.7 12-1.3 1.4-2.9 2.2-3.8 2.2s-2.5-.8-3.8-2.2C7.9 20.7 6 16.5 6 11.5h4Z"
          fill="currentColor"
        />
        <path
          d="M12 10.5c2.7-1.8 7.7-1.8 10.4 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.2"
          opacity="0.3"
        />
      </svg>
      <span>Acorn</span>
    </div>
  );
}
