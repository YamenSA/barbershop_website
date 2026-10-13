import Button from "@/components/ui/Button";
import type { PublicServiceRead, PublicSlot } from "@/lib/types";
import { formatSalonDateTimeNumeric } from "@/lib/time";
import { formatServicePrice } from "@/components/public/serviceGroups";

export default function BookingSummary({ services, memberName, slot, label, disabled, submitting, onNext, onBack, step }: {
  services: PublicServiceRead[]; memberName: string; slot: PublicSlot | null;
  label: string; disabled: boolean; submitting: boolean; onNext: () => void; onBack: () => void; step: number;
}) {
  const duration = services.reduce((sum, service) => sum + service.duration_minutes, 0);
  const price = formatServicePrice(services.reduce((sum, service) => sum + service.price_cents, 0), services.some(service => service.price_is_from));
  const action = <Button size="lg" className="w-full" disabled={disabled || submitting} onClick={onNext}>{label}</Button>;
  return (
    <>
      <aside aria-label="Deine Auswahl" className="hidden min-w-0 lg:block">
        <div className="sticky top-6 max-h-[calc(100svh-3rem)] overflow-y-auto rounded-[20px] border border-line bg-surface-raise p-7">
          <h2 className="font-brand text-[28px] uppercase leading-8">Deine Auswahl</h2>
          {!services.length && <p className="mt-5 text-sm text-ink-muted">Noch keine Leistung gewählt.</p>}
          <ul className="mt-5 space-y-3">{services.map(service => <li key={service.id} className="flex items-start justify-between gap-4 text-sm leading-6"><span>{service.name}</span><span className="shrink-0 whitespace-nowrap tabular-nums">{formatServicePrice(service.price_cents, service.price_is_from)}</span></li>)}</ul>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 border-y border-line py-5 text-sm leading-6">
            <dt className="text-ink-muted">Bei</dt><dd className="text-right">{memberName}</dd>
            <dt className="text-ink-muted">Termin</dt><dd className="text-right tabular-nums">{slot ? formatSalonDateTimeNumeric(slot.starts_at) : "Noch nicht gewählt"}</dd>
            <dt className="text-ink-muted">Dauer</dt><dd className="text-right">{duration ? `${duration} Min.` : "—"}</dd>
          </dl>
          <p className="mt-5 flex justify-between gap-4 text-xl font-bold"><span>Gesamt</span><span className="tabular-nums">{price}</span></p>
          <p className="my-5 rounded-lg bg-surface-card p-3 text-sm leading-6 text-ink-muted"><span aria-hidden="true" className="mr-2 text-gold-300">€</span>Barzahlung vor Ort, keine Online-Zahlung.</p>
          {action}
          {step > 0 && <button type="button" disabled={submitting} onClick={onBack} className="mt-2 min-h-12 w-full text-sm font-semibold text-ink-muted hover:text-gold-300 disabled:cursor-not-allowed">← Zurück</button>}
        </div>
      </aside>
      <div data-booking-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-raise px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-[680px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{services.length === 1 ? services[0].name : services.length ? `${services.length} Leistungen` : "Noch keine Leistung gewählt"}</p><p className="mt-1 text-xs leading-5 text-ink-muted">{duration ? `${duration} Min.` : "Preis und Dauer erscheinen hier"}{slot ? ` · ${formatSalonDateTimeNumeric(slot.starts_at)}` : ""}</p></div>
            <p className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums">{price}</p>
          </div>
          <p className="mb-3 mt-2 text-xs text-ink-muted"><span aria-hidden="true" className="mr-2 text-gold-300">€</span>Barzahlung vor Ort</p>
          {action}
        </div>
      </div>
    </>
  );
}
