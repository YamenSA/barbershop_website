import type { PublicServiceRead, TargetGroup } from "@/lib/types";
import { buildSections, formatServicePrice, TARGET_GROUPS } from "@/components/public/serviceGroups";

export default function ServiceChoice({ services, selectedIds, audience, onAudience, onToggle }: {
  services: PublicServiceRead[]; selectedIds: string[]; audience: TargetGroup;
  onAudience: (group: TargetGroup) => void; onToggle: (id: string) => void;
}) {
  const groups = TARGET_GROUPS.filter(group => services.some(s => s.target_group === group.key)).sort((a, b) => ["DAMEN", "HERREN", "KINDER"].indexOf(a.key) - ["DAMEN", "HERREN", "KINDER"].indexOf(b.key));
  return (
    <div>
      <h2 className="font-brand text-[32px] uppercase leading-9">Was darf es sein?</h2>
      <p className="mt-3 max-w-[60ch] text-sm leading-6 text-ink-muted">Wähle eine oder mehrere Leistungen für deinen Besuch. Ein Teammitglied übernimmt deinen gesamten Termin.</p>
      <div role="group" aria-label="Leistungsgruppe" className="mt-6 flex rounded-full border border-line bg-surface-raise p-1">
        {groups.map(group => <button key={group.key} type="button" aria-pressed={audience === group.key} onClick={() => onAudience(group.key)} className={`min-h-12 flex-1 rounded-full px-4 text-sm font-semibold ${audience === group.key ? "bg-ink text-surface-pitch" : "text-ink-muted hover:text-ink"}`}>{group.label}</button>)}
      </div>
      {selectedIds.length === 0 && <p className="mt-6 rounded-xl border border-dashed border-line-control p-4 text-sm leading-6 text-ink-muted">Noch keine Leistung gewählt. Preis und Dauer erscheinen in deiner Zusammenfassung.</p>}
      <p role="status" className="mt-4 text-sm text-ink-muted">{selectedIds.length ? `${selectedIds.length} ${selectedIds.length === 1 ? "Leistung gewählt" : "Leistungen gewählt"}` : "Mehrfachauswahl möglich"}</p>
      <div className="mt-6 space-y-7">
        {buildSections(services.filter(s => s.target_group === audience), audience).map(section => <fieldset key={section.label}>
          <legend className="mb-3 text-sm font-bold text-gold-300">{section.label}</legend>
          <div className="space-y-3">{section.items.map(service => {
            const selected = selectedIds.includes(service.id);
            return <label key={service.id} data-booking-service={service.id} className={`flex min-h-[88px] cursor-pointer items-center gap-4 rounded-xl border p-4 ${selected ? "border-gold-500 bg-surface-hover" : "border-line bg-surface-card hover:bg-surface-hover"}`}>
              <input type="checkbox" checked={selected} onChange={() => onToggle(service.id)} disabled={!selected && selectedIds.length >= 20} className="h-6 w-6 shrink-0 rounded" />
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold leading-[22px]">{service.name}</span><span className="mt-1 block text-sm text-ink-muted">{service.duration_minutes} Min.</span></span>
              <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums">{formatServicePrice(service.price_cents, service.price_is_from)}</span>
            </label>;
          })}</div>
        </fieldset>)}
      </div>
      {selectedIds.length >= 20 && <p className="mt-4 text-sm text-ink-muted">Für einen Termin kannst du bis zu 20 Leistungen auswählen.</p>}
    </div>
  );
}
