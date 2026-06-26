import type { Metadata } from 'next';
import { ueberUns } from '@/content/ueber-uns';
import BookingCta from '@/components/public/BookingCta';

export const metadata: Metadata = {
  title: 'Über uns | Azzam Barbershop Cottbus',
  description:
    'Lernen Sie Azzam Barbershop kennen — Handwerk, Geschichte und die Werte hinter jedem Schnitt.',
};

export const revalidate = 3600;

export default function UeberUnsPage() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-8"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          {ueberUns.headline}
        </h1>

        <p className="text-secondary text-lg leading-relaxed max-w-[65ch] mb-14">
          {ueberUns.intro}
        </p>

        <div className="space-y-12">
          {ueberUns.sections.map((section) => (
            <article key={section.heading}>
              <h2 className="font-display font-bold text-xl tracking-[-0.02em] text-ink mb-3">
                {section.heading}
              </h2>
              <p className="text-secondary leading-relaxed max-w-[65ch]">
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-[oklch(0.95_0.004_140/0.08)]">
          <p className="text-secondary mb-6 max-w-[55ch]">
            Überzeugen Sie sich selbst — buchen Sie Ihren Termin und erleben Sie
            den Unterschied.
          </p>
          <BookingCta />
        </div>
      </div>
    </section>
  );
}
