import type { Metadata } from 'next';
import { getPublicServices } from '@/lib/api';
import PriceList from '@/components/public/PriceList';
import EmptyState from '@/components/public/EmptyState';
import BookingCta from '@/components/public/BookingCta';

export const metadata: Metadata = {
  title: 'Dienstleistungen & Preise | Ihr Friseur & Barbershop in Cottbus',
  description:
    'Entdecken Sie unsere Dienstleistungen für Herren, Damen und Kinder bei Ihrem modernen Friseur und Barbershop in Cottbus. Transparente Preise und hohe Präzision.',
};

export const revalidate = 60;

export default async function DienstleistungenPage() {
  const services = await getPublicServices().catch(() => []);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center flex flex-col items-center">
          <h1
            className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Dienstleistungen &amp; Preise
          </h1>
          <p className="text-secondary text-lg leading-relaxed max-w-[55ch]">
            Präzise Handwerkskunst bei Ihrem Friseur &amp; Barbershop in Cottbus. Wählen Sie Ihren Service.
          </p>
        </div>

        {services.length === 0 ? (
          <EmptyState
            title="Keine Dienstleistungen verfügbar"
            description="Wir aktualisieren gerade unser Angebot. Bitte schauen Sie später wieder vorbei."
            action={<BookingCta />}
          />
        ) : (
          <>
            {/* Walk-in notice banner */}
            <div className="mb-8 p-4 bg-slate border border-brass/20 rounded-[8px] max-w-3xl mx-auto flex items-center justify-center gap-2.5 text-center text-sm font-semibold text-ink">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px] shrink-0 text-brass"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>Herren ohne Termin / Damen nur mit Termin</span>
            </div>

            <PriceList services={services} />

            <div className="flex justify-center mt-12">
              <BookingCta />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
