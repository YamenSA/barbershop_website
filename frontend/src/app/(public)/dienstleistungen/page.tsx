import type { Metadata } from 'next';
import { getPublicServices } from '@/lib/api';
import ServiceCard from '@/components/public/ServiceCard';
import EmptyState from '@/components/public/EmptyState';
import BookingCta from '@/components/public/BookingCta';

export const metadata: Metadata = {
  title: 'Dienstleistungen',
  description:
    'Entdecken Sie unser Angebot: Herrenhaarschnitte, Bartpflege, Fades und mehr — mit transparenten Preisen.',
};

export const revalidate = 60;

export default async function DienstleistungenPage() {
  let services = await getPublicServices().catch(() => []);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1
            className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Dienstleistungen
          </h1>
          <p className="text-ash text-lg leading-relaxed max-w-[55ch]">
            Präzise Handwerkskunst für jeden Anlass — wählen Sie Ihren Service.
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
            <ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-16"
              aria-label="Dienstleistungen"
            >
              {services.map((service) => (
                <li key={service.id}>
                  <ServiceCard service={service} />
                </li>
              ))}
            </ul>

            <div className="flex justify-center">
              <BookingCta />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
