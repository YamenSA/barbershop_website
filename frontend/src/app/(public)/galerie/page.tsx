import type { Metadata } from 'next';
import { loadGallery } from '@/lib/content';
import BeforeAfterGallery from '@/components/public/BeforeAfterGallery';
import BookingCta from '@/components/public/BookingCta';

export const metadata: Metadata = {
  title: 'Galerie — Vorher & Nachher | Azzam Barbershop Cottbus',
  description:
    'Vorher/Nachher-Beispiele aus dem Azzam Barbershop in Cottbus — Haarschnitte, Fade, Bartpflege und Styling. Die gezeigten Bilder sind KI-generierte Beispiele.',
};

export default function GaleriePage() {
  // loadGallery() applies the consent guard at server-render time:
  // items without a non-empty consentProofId are filtered out (SC-005 / FR-016).
  const items = loadGallery();

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-4"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          Galerie
        </h1>
        <p className="text-secondary text-lg leading-relaxed max-w-[55ch] mb-3">
          Beispielhafte Vorher/Nachher-Looks — sie zeigen, welche Schnitte, Fades und
          Bartstylings im Azzam Barbershop in Cottbus möglich sind.
        </p>
        <p className="text-tertiary text-sm leading-relaxed max-w-[55ch] mb-12">
          Hinweis: Die gezeigten Bilder sind KI-generierte Beispiele und stellen keine
          realen Kundenfotos dar.
        </p>

        <BeforeAfterGallery items={items} />

        <div className="mt-14 pt-10 border-t border-[oklch(0.95_0.004_140/0.08)] flex flex-col items-start gap-4">
          <p className="text-secondary">
            Überzeugt? Buchen Sie jetzt Ihren Termin.
          </p>
          <BookingCta />
        </div>
      </div>
    </section>
  );
}
