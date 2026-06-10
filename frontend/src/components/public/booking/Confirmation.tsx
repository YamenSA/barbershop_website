import type { PublicAppointmentRead } from '@/lib/types';

interface Props {
  result: PublicAppointmentRead;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Confirmation({ result }: Props) {
  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-malachite/15 text-malachite">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
        <h2 className="font-display font-bold text-ink text-xl">Termin bestätigt</h2>
      </div>

      <div className="bg-slate rounded-[var(--radius-card)] px-5 py-4 space-y-3 mb-6">
        <div>
          <span className="text-ash text-xs">Datum &amp; Uhrzeit</span>
          <p className="text-ink text-sm font-medium mt-0.5">{formatDateTime(result.starts_at)}</p>
        </div>
        <div>
          <span className="text-ash text-xs">Zahlung</span>
          <p className="text-ink text-sm font-medium mt-0.5">{result.payment_note}</p>
        </div>
      </div>

      <p className="text-ash text-sm leading-relaxed mb-6">
        Sie erhalten in Kürze eine Bestätigung per E-Mail mit einem Link zum Stornieren des Termins
        (bis 24 Stunden vorher möglich).
      </p>

      <a
        href="/"
        className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-slate text-ash text-sm rounded-[var(--radius-btn)] hover:border-ash hover:text-ink transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
      >
        Zurück zur Startseite
      </a>
    </div>
  );
}
