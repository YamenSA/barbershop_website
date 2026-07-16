'use client';

import { useState } from 'react';
import type { PublicServiceRead, TargetGroup } from '@/lib/types';
import {
  GroupIcon,
  getAvailableGroups,
  buildSections,
  formatServicePrice,
  formatServiceCount,
} from '../serviceGroups';

interface Props {
  services: PublicServiceRead[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function ServicePicker({ services, selected, onSelect }: Props) {
  const availableGroups = getAvailableGroups(services);

  // Restore the group from an already-selected service (e.g. when navigating
  // back from the stylist step) so the user lands on the right list.
  const initialGroup =
    (selected && services.find((s) => s.id === selected)?.target_group) || null;
  const [group, setGroup] = useState<TargetGroup | null>(initialGroup);

  if (services.length === 0) {
    return <p className="text-ash text-sm">Aktuell sind keine Dienstleistungen online buchbar.</p>;
  }

  // Phase 1 — choose the target group.
  if (!group) {
    return (
      <div>
        <h2 className="font-display font-bold text-ink text-xl mb-6">Für wen ist der Termin?</h2>
        <div
          role="group"
          aria-label="Zielgruppe wählen"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
        >
          {availableGroups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              className="group flex flex-col items-center text-center gap-2.5 rounded-[12px] px-4 py-6 border border-hairline bg-slate shadow-bevel hover:border-malachite/60 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-malachite/60"
            >
              <span className="text-ash group-hover:text-malachite transition-colors duration-150">
                <GroupIcon group={g.key} />
              </span>
              <span className="font-display font-bold text-lg leading-none tracking-tight text-secondary group-hover:text-ink transition-colors duration-150">
                {g.label}
              </span>
              <span className="text-tertiary text-xs font-medium">
                {formatServiceCount(g.count)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phase 2 — choose a service within the group.
  const sections = buildSections(services, group);
  const activeLabel = availableGroups.find((g) => g.key === group)?.label ?? '';

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="font-display font-bold text-ink text-xl">Dienstleistung wählen</h2>
        <button
          type="button"
          onClick={() => setGroup(null)}
          className="shrink-0 inline-flex items-center gap-1.5 text-ash text-sm hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-malachite/60 rounded px-1"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden>
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {activeLabel}
        </button>
      </div>

      <div className="flex flex-col gap-7">
        {sections.map((section) => (
          <section key={section.label} className="flex flex-col gap-3">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-brass border-b border-white/5 pb-2">
              {section.label}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2" role="listbox" aria-label={section.label}>
              {section.items.map((svc) => {
                const isSelected = selected === svc.id;
                return (
                  <li key={svc.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => onSelect(svc.id)}
                      className={`w-full h-full text-left px-5 py-4 rounded-[var(--radius-card)] border transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
                        isSelected
                          ? 'border-malachite bg-malachite/10 shadow-glow'
                          : 'border-hairline bg-slate shadow-bevel hover:border-hairline-strong hover:shadow-lift hover:-translate-y-0.5'
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-ink text-sm">{svc.name}</span>
                        <span className="shrink-0 text-brass text-sm font-semibold tabular-nums">
                          {formatServicePrice(svc.price_cents, svc.price_is_from)}
                        </span>
                      </span>
                      {svc.description && (
                        <span className="block text-ash text-xs mt-1.5 leading-relaxed">
                          {svc.description}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
