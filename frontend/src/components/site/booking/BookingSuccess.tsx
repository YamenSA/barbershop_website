import Button from "@/components/ui/Button";
import { appointmentCalendar } from "@/lib/appointment-calendar";
import { formatSalonDateTimeLong } from "@/lib/time";
import { formatServicePrice } from "@/components/public/serviceGroups";
import type { BookedService, PublicAppointmentRead, SalonProfile } from "@/lib/types";

export default function BookingSuccess({ result, services, memberName, name, profile, preview, onRestart }: {
  result: PublicAppointmentRead; services: BookedService[]; memberName: string; name: string;
  profile: SalonProfile | null; preview: boolean; onRestart: () => void;
}) {
  const calendar = appointmentCalendar(result, services.map(service => service.name), profile);
  const route = profile ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.street}, ${profile.postal_code} ${profile.city}`)}` : undefined;
  return (
    <div className="mx-auto max-w-[760px] py-8 text-center lg:py-12">
      <div aria-hidden="true" className="mx-auto flex h-[156px] w-28 items-center justify-center rounded-arch border border-gold-500 font-brand text-6xl text-success">✓</div>
      <h1 tabIndex={-1} id="booking-success" className="mt-6 font-brand text-[40px] uppercase leading-[44px] lg:text-[64px] lg:leading-[68px]">{preview ? "Vorschau abgeschlossen" : "Termin bestätigt"}</h1>
      <p className="mt-4 text-base leading-7 text-ink-muted">{preview ? "Es wurde kein Termin gespeichert und keine E-Mail versendet." : `Bis bald, ${name.trim().split(/\s+/)[0]}. Deine Bestätigung und den Absage-Link erhältst du per E-Mail.`}</p>
      <div className="mt-7 rounded-xl border border-line bg-surface-raise p-5 text-left sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-ink-muted">{preview ? "Beispiel deiner Auswahl" : "Dein Termin"}</p>
        {!preview && <p className="mt-2 break-all text-sm text-ink-muted">Buchungsnummer: <span className="text-ink">{result.id}</span></p>}
        <ul className="mt-4 space-y-2">{services.map(service => <li key={service.id} className="flex justify-between gap-4 text-sm leading-6"><span>{service.name}</span><span className="shrink-0 tabular-nums">{formatServicePrice(service.price_cents, service.price_is_from)}</span></li>)}</ul>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 border-t border-line pt-5 text-sm leading-6">
          <dt className="text-ink-muted">Bei</dt><dd>{memberName}</dd>
          <dt className="text-ink-muted">Termin</dt><dd className="tabular-nums">{formatSalonDateTimeLong(result.starts_at)}</dd>
          <dt className="text-ink-muted">Dauer</dt><dd>{services.reduce((sum, service) => sum + service.duration_minutes, 0)} Min.</dd>
          <dt className="text-ink-muted">Gesamt</dt><dd className="font-bold tabular-nums">{formatServicePrice(services.reduce((sum, service) => sum + service.price_cents, 0), services.some(service => service.price_is_from))}</dd>
          <dt className="text-ink-muted">Zahlung</dt><dd>Vor Ort</dd>
        </dl>
      </div>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`} download={preview ? "azzam-vorschau.ics" : `azzam-termin-${result.id}.ics`} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-gold-500 px-6 text-sm font-bold text-gold-300 hover:bg-surface-card">{preview ? "Kalender-Demo herunterladen" : "In Kalender eintragen (.ics)"}</a>
        {route && <Button href={route} variant="secondary" target="_blank" rel="noopener noreferrer">Route planen<span className="sr-only"> (neuer Tab)</span></Button>}
      </div>
      <p className="mt-5 text-sm leading-6 text-ink-muted">Bis 24 Stunden vorher kannst du über deine Bestätigungs-E-Mail absagen. Bei kurzfristigen Absagen ruf bitte im Salon an.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3"><Button href="/" variant="text">Zur Startseite</Button>{preview && <Button variant="text" onClick={onRestart}>Vorschau neu starten</Button>}</div>
    </div>
  );
}
