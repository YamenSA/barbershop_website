import type { PublicPromotion } from '@/lib/types';

interface PromotionsSectionProps {
  promotions: PublicPromotion[];
}

/**
 * T028 – PromotionsSection
 * Renders active promotions fetched from /public/promotions.
 * Renders nothing when the list is empty (no active promotions → clean hide).
 */
export default function PromotionsSection({ promotions }: PromotionsSectionProps) {
  if (promotions.length === 0) return null;

  return (
    <section
      aria-label="Aktuelle Angebote"
      className="px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="max-w-7xl mx-auto">
        <h2
          className="font-display font-extrabold tracking-[-0.02em] text-ink mb-2"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          Aktuelle Angebote
        </h2>
        <p className="text-ash text-sm mb-8">
          Befristete Aktionen — jetzt einen Termin sichern.
        </p>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo) => {
            const startsFormatted = new Date(promo.starts_on).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const endsFormatted = new Date(promo.ends_on).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <li
                key={promo.id}
                className="flex flex-col justify-between rounded-[8px] border border-malachite/20 bg-slate p-6 transition-all duration-150 ease-out hover:border-malachite/40"
              >
                {/* Badge */}
                <span className="mb-4 inline-flex w-fit items-center rounded-full bg-malachite/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-malachite">
                  Angebot
                </span>

                <div className="mb-6 flex-1">
                  <h3 className="font-display font-bold text-lg text-ink mb-2 leading-snug">
                    {promo.title}
                  </h3>
                  <p className="text-ash text-sm leading-relaxed">{promo.description}</p>
                </div>

                <p className="text-xs text-ash border-t border-white/[0.06] pt-4 mt-4">
                  Gültig: {startsFormatted} – {endsFormatted}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
