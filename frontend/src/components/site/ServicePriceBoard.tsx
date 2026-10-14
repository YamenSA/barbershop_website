"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import type { PublicServiceRead, TargetGroup } from "@/lib/types";
import { buildSections, formatServiceCount, formatServicePrice } from "@/components/public/serviceGroups";
import Card from "@/components/ui/Card";

const audiences: { key: TargetGroup; label: string }[] = [
  { key: "DAMEN", label: "Damen" },
  { key: "HERREN", label: "Herren" },
  { key: "KINDER", label: "Kinder" },
];
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";

export default function ServicePriceBoard({ services }: { services: PublicServiceRead[] }) {
  const groups = audiences.filter((group) => services.some((service) => service.target_group === group.key));
  const [selected, setSelected] = useState<TargetGroup | null>(null);
  const active = groups.some((group) => group.key === selected) ? selected : groups[0]?.key;
  const id = useId();

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % groups.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + groups.length) % groups.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = groups.length - 1;
    else return;
    event.preventDefault();
    setSelected(groups[next].key);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  if (!groups.length) {
    return <Card><h2 className="font-brand text-3xl">Keine Leistungen verfügbar</h2><p className="mt-3 text-ink-muted">Bitte versuche es später erneut oder kontaktiere den Salon.</p></Card>;
  }

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 bg-surface-base px-4 pb-6 pt-2 md:-mx-8 md:px-8 lg:hidden">
        <div role="tablist" aria-label="Leistungen für Damen, Herren oder Kinder" className="flex gap-1 rounded-full border border-line bg-surface-raise p-1">
          {groups.map((group, index) => (
            <button key={group.key} type="button" role="tab" id={`${id}-tab-${group.key}`} aria-controls={`${id}-panel-${group.key}`} aria-selected={active === group.key} tabIndex={active === group.key ? 0 : -1} onClick={() => setSelected(group.key)} onKeyDown={(event) => handleKey(event, index)} className={`h-12 min-w-0 flex-1 rounded-full px-3 font-semibold ${focus} ${active === group.key ? "bg-ink text-surface-pitch" : "text-ink-muted hover:text-ink"}`}>
              {group.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-x-[72px] lg:gap-y-12">
        {groups.map((group) => {
          const items = services.filter((service) => service.target_group === group.key);
          const sections = buildSections(services, group.key);
          return (
            <section key={group.key} role="tabpanel" id={`${id}-panel-${group.key}`} aria-labelledby={`${id}-tab-${group.key}`} tabIndex={0} className={`${active === group.key ? "block" : "hidden"} min-w-0 lg:block ${focus}`}>
              <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-gold-500 pb-4">
                <h2 className="font-brand text-[32px] uppercase leading-9 lg:text-5xl">{group.label}</h2>
                <p className="text-sm text-ink-subtle">{formatServiceCount(items.length)}</p>
              </div>
              <div className="space-y-8 lg:space-y-10">
                {sections.map((section) => (
                  <section key={section.label} aria-label={section.label}>
                    <h3 className="mb-2 font-brand text-2xl uppercase leading-7 text-gold-300 lg:text-[26px] lg:leading-[30px]">{section.label}</h3>
                    <ul>
                      {section.items.map((service) => (
                        <li key={service.id} data-service-id={service.id} className="flex items-center gap-3 border-b border-line py-3.5 lg:gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[15px] font-semibold leading-[21px] lg:text-base lg:leading-[22px]">{service.name}</h4>
                            {service.description && <p className="mt-1 text-[13px] leading-5 text-ink-muted">{service.description}</p>}
                            <p className="mt-1 text-[13px] leading-[18px] text-ink-subtle">{service.duration_minutes} Min.</p>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold tabular-nums lg:text-base">{formatServicePrice(service.price_cents, service.price_is_from)}</span>
                          <Link href={`/termin?service=${encodeURIComponent(service.id)}`} aria-label={`${service.name} buchen`} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line-control text-gold-300 hover:border-gold-300 hover:bg-surface-hover lg:w-auto lg:rounded-lg lg:border-0 lg:px-2 ${focus}`}>
                            <span aria-hidden="true" className="text-xl lg:hidden">+</span>
                            <span aria-hidden="true" className="hidden text-[13px] font-semibold lg:inline">Buchen</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {services.some((service) => service.price_is_from) && <Card className="mt-8 lg:mt-12">
        <h2 className="font-semibold">„ab“-Preise</h2>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-ink-muted">Der Endpreis hängt von Haarlänge und Aufwand ab. Wir besprechen ihn vor Beginn. Bezahlt wird vor Ort.</p>
      </Card>}
    </>
  );
}
