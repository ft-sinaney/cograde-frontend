export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path
        d="M28 9a13 13 0 1 0 0 22"
        stroke="url(#logo-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15.5 20.5l3 3 6.5-6.5"
        stroke="#2dd4bf"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoWordmark({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Logo size={size} />
      <span
        className="font-bold tracking-tight text-text"
        style={{ fontSize: size * 0.72 }}
      >
        Co<span className="text-gradient">Grade</span>
      </span>
    </div>
  );
}
