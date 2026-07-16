import type { PublicServiceRead, TargetGroup } from '@/lib/types';

/**
 * Shared target-group + price-board layout used by both the public price list
 * (`PriceList`) and the booking service picker (`ServicePicker`), so the two
 * stay in sync. Section order and item order mirror the salon's physical
 * Herren/Damen price boards; items are matched by exact service name.
 */

export const TARGET_GROUPS: { key: TargetGroup; label: string }[] = [
  { key: 'HERREN', label: 'Herren' },
  { key: 'DAMEN', label: 'Damen' },
  { key: 'KINDER', label: 'Kinder' },
];

export const SECTION_LAYOUT: Record<TargetGroup, { label: string; items: string[] }[]> = {
  HERREN: [
    {
      label: 'Haare & Bart',
      items: [
        'Schneiden, Föhnen & Stylen',
        'Schneiden, Föhnen & Bart',
        'Schneiden Style 1-12 Jahre',
        'Maschinenschnitt',
        'Bart',
        'Bartrasur',
        'Haaremuster',
      ],
    },
    {
      label: 'Gesichtspflege',
      items: [
        'Augenbrauen zupfen (Fadentechnik)',
        'Gesichtshaarentfernung',
        'Nasenhaarentfernung',
        'Ohrenhaarentfernung',
        'Gesichtsdampfer',
        'Gesichtspflege Komplettpaket',
        'Gesichtsmaske',
      ],
    },
    {
      label: 'Premium-Paket',
      items: ['Premium-Paket (Rundum-Verwöhnung)'],
    },
  ],
  DAMEN: [
    {
      label: 'Stylen & Schneiden',
      items: [
        'Waschen, Föhnen & Stylen (Kurz)',
        'Waschen, Föhnen & Stylen (Mittel)',
        'Waschen, Föhnen & Stylen (Lang)',
        'Schneiden, Waschen, Föhnen & Style (Kurz)',
        'Schneiden, Waschen, Föhnen & Style (Mittel)',
        'Schneiden, Waschen, Föhnen & Style (Lang)',
        'Volumenwelle',
        'Dauerwelle',
        'Augenbrauen zupfen',
      ],
    },
    {
      label: 'Färben',
      items: [
        'Neufärbung',
        'Tönung',
        'Intensivtönung',
        'Blondierung',
        'Foliensträhnen mehrfarbig',
        'Wimpern färben',
        'Augenbrauen färben',
      ],
    },
    {
      label: 'Pflege & Entspannung',
      items: ['Kur', 'Kopfmassage'],
    },
    {
      label: 'Brautstyling',
      items: ['Brautstyling inkl. Beratung'],
    },
  ],
  KINDER: [],
};

/** lucide-style inline stroke icons per target group (no icon dependency). */
export function GroupIcon({ group, className = 'h-7 w-7' }: { group: TargetGroup; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
  };

  if (group === 'HERREN') {
    // Scissors
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
      </svg>
    );
  }
  if (group === 'DAMEN') {
    // Sparkles
    return (
      <svg {...common}>
        <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
      </svg>
    );
  }
  // KINDER — smiling face
  return (
    <svg {...common}>
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
      <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
    </svg>
  );
}

export interface ServiceSection {
  label: string;
  items: PublicServiceRead[];
}

/** Target groups that actually have services, with their service count. */
export function getAvailableGroups(services: PublicServiceRead[]) {
  return TARGET_GROUPS.map((group) => ({
    ...group,
    count: services.filter((s) => s.target_group === group.key).length,
  })).filter((group) => group.count > 0);
}

/**
 * Group a target group's services into board sections (in board order). Any
 * service not covered by SECTION_LAYOUT still shows up under "Weitere
 * Leistungen" so admin-added services never silently disappear.
 */
export function buildSections(services: PublicServiceRead[], group: TargetGroup): ServiceSection[] {
  const groupServices = services.filter((s) => s.target_group === group);
  const byName = new Map(groupServices.map((s) => [s.name, s]));

  const placed = new Set<string>();
  const sections: ServiceSection[] = SECTION_LAYOUT[group]
    .map((section) => {
      const items = section.items
        .map((name) => byName.get(name))
        .filter((s): s is PublicServiceRead => Boolean(s));
      items.forEach((s) => placed.add(s.name));
      return { label: section.label, items };
    })
    .filter((section) => section.items.length > 0);

  const leftover = groupServices.filter((s) => !placed.has(s.name));
  if (leftover.length > 0) {
    sections.push({ label: 'Weitere Leistungen', items: leftover });
  }

  return sections;
}

/** "18,00 €" or "ab 18,00 €" for starting prices. */
export function formatServicePrice(cents: number, isFrom = false): string {
  const value = `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  return isFrom ? `ab ${value}` : value;
}

export function formatServiceCount(n: number): string {
  return n === 1 ? '1 Leistung' : `${n} Leistungen`;
}
