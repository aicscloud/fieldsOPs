import Link from 'next/link';

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      className="brand-svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Intervenio"
    >
      <rect width="32" height="32" rx="8" fill="#143d4f" />
      <path
        fill="#fff"
        d="M16 6.2c-3.9 0-7 3.05-7 6.8 0 5.05 7 12.8 7 12.8s7-7.75 7-12.8c0-3.75-3.1-6.8-7-6.8zm0 9.15a2.35 2.35 0 1 1 0-4.7 2.35 2.35 0 0 1 0 4.7z"
      />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand">
      <LogoMark />
      <span className="brand-name">
        Inter<span>venio</span>
      </span>
    </Link>
  );
}
