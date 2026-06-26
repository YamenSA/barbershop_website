import Link from 'next/link';

interface Props {
  className?: string;
}

export default function BookingCta({ className }: Props) {
  return (
    <Link
      href="/termin"
      className={`inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 bg-malachite text-midnight font-semibold text-sm rounded-[4px] transition-transform duration-[150ms] ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${className ?? ''}`}
    >
      Termin buchen
    </Link>
  );
}
