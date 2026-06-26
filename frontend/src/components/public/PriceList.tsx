'use client';

import { useState } from 'react';
import type { PublicServiceRead, TargetGroup, ServiceKind } from '@/lib/types';

const TARGET_GROUPS: { key: TargetGroup; label: string }[] = [
  { key: 'HERREN', label: 'Herren' },
  { key: 'DAMEN', label: 'Damen' },
  { key: 'KINDER', label: 'Kinder' },
];

const SERVICE_KINDS: { key: ServiceKind; label: string }[] = [
  { key: 'SCHNITT', label: 'Haarschnitte' },
  { key: 'BART', label: 'Bartpflege' },
  { key: 'FARBE', label: 'Farbe & Tönung' },
  { key: 'STYLING', label: 'Styling' },
  { key: 'SONSTIGES', label: 'Zusatzleistungen' },
];

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
  }
  return `${minutes} Min.`;
}

interface PriceListProps {
  services: PublicServiceRead[];
}

export default function PriceList({ services }: PriceListProps) {
  const [activeGroup, setActiveGroup] = useState<TargetGroup>('HERREN');

  // Filter services by active group
  const groupServices = services.filter((s) => s.target_group === activeGroup);

  // Group by known service kind…
  const knownKinds = new Set<string>(SERVICE_KINDS.map((k) => k.key));
  const groupedByKind: { key: string; label: string; items: PublicServiceRead[] }[] =
    SERVICE_KINDS.map((kind) => ({
      key: kind.key as string,
      label: kind.label,
      items: groupServices.filter((s) => s.service_kind === kind.key),
    })).filter((g) => g.items.length > 0);

  // …plus a safety bucket so a service with an unknown/new service_kind never
  // silently disappears from a tab (would otherwise read as "empty category").
  const uncategorized = groupServices.filter((s) => !knownKinds.has(s.service_kind));
  if (uncategorized.length > 0) {
    groupedByKind.push({ key: '__weitere__', label: 'Weitere Leistungen', items: uncategorized });
  }

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Target Group Navigation Tabs */}
      <div className="flex border-b border-white/5 gap-6 justify-center">
        {TARGET_GROUPS.map((group) => {
          const isActive = activeGroup === group.key;
          return (
            <button
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              className={`pb-4 text-lg font-bold tracking-tight transition-all duration-150 ease-out active:scale-97 relative cursor-pointer ${
                isActive ? 'text-malachite' : 'text-ash hover:text-ink'
              }`}
            >
              {group.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-malachite" />
              )}
            </button>
          );
        })}
      </div>

      {/* Services List */}
      <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
        {groupedByKind.length === 0 ? (
          <p className="text-ash text-center py-8">Keine Leistungen in dieser Kategorie gefunden.</p>
        ) : (
          groupedByKind.map((group) => (
            <section key={group.key} className="flex flex-col gap-4">
              <h3 className="font-display font-bold text-lg uppercase tracking-wider text-brass border-b border-white/5 pb-2">
                {group.label}
              </h3>
              <div className="grid gap-3">
                {group.items.map((service) => (
                  <article
                    key={service.id}
                    className="bg-slate rounded-[8px] p-5 flex justify-between items-start gap-4 border border-white/[0.02] hover:border-white/5 transition-all duration-150 ease-out"
                  >
                    <div className="flex flex-col gap-1.5">
                      <h4 className="font-bold text-ink text-base leading-snug">
                        {service.name}
                      </h4>
                      <p className="text-ash text-xs font-medium">
                        {formatDuration(service.duration_minutes)}
                      </p>
                      {service.description && (
                        <p className="text-ash text-sm leading-relaxed max-w-[60ch] mt-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 px-3 py-1 rounded-[4px] text-sm font-semibold tabular-nums text-brass bg-brass/10 border border-brass/10">
                      {formatPrice(service.price_cents)}
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
