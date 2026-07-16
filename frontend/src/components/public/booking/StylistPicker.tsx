'use client';

import type { PublicTeamMemberRead, UUID } from '@/lib/types';

interface Props {
  members: PublicTeamMemberRead[];
  serviceId: string;
  selected: string | null; // null = "any"
  onSelect: (id: string | null) => void;
}

export default function StylistPicker({ members, serviceId, selected, onSelect }: Props) {
  const eligible = members.filter((m) =>
    m.services.some((s) => s.id === serviceId),
  );

  const options: Array<{ id: string | null; name: string; bio?: string }> = [
    { id: null, name: 'Beliebiger Stylist', bio: 'Wir wählen den nächsten freien Stylist für Sie.' },
    ...eligible.map((m) => ({ id: m.id, name: m.name, bio: m.bio ?? undefined })),
  ];

  return (
    <div>
      <h2 className="font-display font-bold text-ink text-xl mb-6">Stylist wählen</h2>
      {eligible.length === 0 ? (
        <p className="text-ash text-sm">Für diese Dienstleistung sind aktuell keine Stylisten verfügbar.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Stylist">
          {options.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <li key={opt.id ?? '__any__'} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => onSelect(opt.id)}
                  className={`w-full text-left px-5 py-4 rounded-[var(--radius-card)] border transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
                    isSelected
                      ? 'border-malachite bg-malachite/10 shadow-glow'
                      : 'border-hairline bg-slate shadow-bevel hover:border-hairline-strong hover:shadow-lift hover:-translate-y-0.5'
                  }`}
                >
                  <span className="block font-semibold text-ink text-sm">{opt.name}</span>
                  {opt.bio && <span className="block text-ash text-xs mt-1">{opt.bio}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
