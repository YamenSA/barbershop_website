'use client';

import { useState } from 'react';
import type { PublicServiceRead, TargetGroup } from '@/lib/types';
import {
  GroupIcon,
  getAvailableGroups,
  buildSections,
  formatServicePrice,
  formatServiceCount,
} from './serviceGroups';

interface PriceListProps {
  services: PublicServiceRead[];
}

export default function PriceList({ services }: PriceListProps) {
  // Only show target groups that actually have services, so an unused group
  // (e.g. Kinder) never renders as an empty, dead-end card.
  const availableGroups = getAvailableGroups(services);

  const [selectedGroup, setSelectedGroup] = useState<TargetGroup | null>(null);
  // Fall back to the first available group until the user picks one (and if the
  // current selection has no services after a data change).
  const activeGroup =
    selectedGroup && availableGroups.some((g) => g.key === selectedGroup)
      ? selectedGroup
      : availableGroups[0]?.key ?? 'HERREN';

  const sections = buildSections(services, activeGroup);
  const panelId = 'services-panel';

  return (
    <div className="w-full flex flex-col gap-10">
      {/* Target-group chooser — the deliberate first choice of the page. */}
      <div className="flex flex-col items-center gap-6">
        <h2 className="font-display font-bold text-xl text-ink tracking-tight text-center">
          Für wen ist der Termin?
        </h2>
        <div
          role="group"
          aria-label="Zielgruppe wählen"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl"
        >
          {availableGroups.map((group) => {
            const isActive = activeGroup === group.key;
            return (
              <button
                key={group.key}
                type="button"
                aria-pressed={isActive}
                aria-controls={panelId}
                onClick={() => setSelectedGroup(group.key)}
                className={`group flex flex-col items-center text-center gap-2.5 rounded-[12px] px-4 py-6 border transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-malachite/60 ${
                  isActive
                    ? 'bg-malachite/10 border-malachite/60 shadow-glow'
                    : 'bg-slate border-hairline shadow-bevel hover:border-hairline-strong hover:shadow-lift hover:-translate-y-0.5'
                }`}
              >
                <span
                  className={`transition-colors duration-150 ${
                    isActive ? 'text-malachite' : 'text-ash group-hover:text-ink'
                  }`}
                >
                  <GroupIcon group={group.key} />
                </span>
                <span
                  className={`font-display font-bold text-lg leading-none tracking-tight transition-colors duration-150 ${
                    isActive ? 'text-ink' : 'text-secondary group-hover:text-ink'
                  }`}
                >
                  {group.label}
                </span>
                <span className="text-tertiary text-xs font-medium">
                  {formatServiceCount(group.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services list for the active group. Re-keyed so the switch animates. */}
      <div
        id={panelId}
        key={activeGroup}
        className="animate-service-list flex flex-col gap-8 max-w-3xl mx-auto w-full"
      >
        {sections.length === 0 ? (
          <p className="text-ash text-center py-8">Keine Leistungen in dieser Kategorie gefunden.</p>
        ) : (
          sections.map((section) => (
            <section key={section.label} className="flex flex-col gap-4">
              <h3 className="font-display font-bold text-lg uppercase tracking-wider text-brass border-b border-white/5 pb-2">
                {section.label}
              </h3>
              <div className="grid gap-3">
                {section.items.map((service) => (
                  <article
                    key={service.id}
                    className="bg-slate rounded-[8px] p-5 flex justify-between items-start gap-4 border border-hairline shadow-bevel hover:border-hairline-strong transition-all duration-150 ease-out"
                  >
                    <div className="flex flex-col gap-1.5">
                      <h4 className="font-bold text-ink text-base leading-snug">
                        {service.name}
                      </h4>
                      {service.description && (
                        <p className="text-ash text-sm leading-relaxed max-w-[60ch]">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 px-3 py-1 rounded-[4px] text-sm font-semibold tabular-nums text-brass bg-brass/10 border border-brass/10">
                      {formatServicePrice(service.price_cents, service.price_is_from)}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
