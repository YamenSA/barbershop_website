'use client';

import type { PublicServiceRead } from '@/lib/types';

interface Props {
  services: PublicServiceRead[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function ServicePicker({ services, selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="font-display font-bold text-ink text-xl mb-6">Dienstleistung wählen</h2>
      {services.length === 0 ? (
        <p className="text-ash text-sm">Aktuell sind keine Dienstleistungen online buchbar.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Dienstleistung">
          {services.map((svc) => {
            const isSelected = selected === svc.id;
            return (
              <li key={svc.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => onSelect(svc.id)}
                  className={`w-full text-left px-5 py-4 rounded-[var(--radius-card)] border transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
                    isSelected
                      ? 'border-malachite bg-malachite/10'
                      : 'border-slate hover:border-ash'
                  }`}
                >
                  <span className="block font-semibold text-ink text-sm">{svc.name}</span>
                  <span className="block text-ash text-xs mt-1">
                    {svc.duration_minutes} Min. · {formatPrice(svc.price_cents)}
                  </span>
                  {svc.description && (
                    <span className="block text-ash text-xs mt-1">{svc.description}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
