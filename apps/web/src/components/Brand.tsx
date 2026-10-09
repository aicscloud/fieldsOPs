import Link from 'next/link';

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span className="brand-logo" style={{ width: size, height: size }}>
      <img src="/brand/logo.jpg" alt="" />
    </span>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand">
      <LogoMark />
      <span className="brand-name">
        Eki<span>pa</span>
      </span>
    </Link>
  );
}
