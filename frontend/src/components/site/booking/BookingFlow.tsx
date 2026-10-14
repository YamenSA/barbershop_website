"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { ApiError, createPublicAppointment, getPublicServices } from "@/lib/api";
import { addDaysISO, formatSalonDateTimeLong, salonToday, weekdayMonday0 } from "@/lib/time";
import type { PublicAppointmentRead, PublicSalonHoursRead, PublicServiceRead, PublicSlot, PublicTeamMemberRead, SalonProfile, TargetGroup } from "@/lib/types";
import { formatServicePrice } from "@/components/public/serviceGroups";
import ServiceChoice from "./ServiceChoice";
import StaffChoice from "./StaffChoice";
import DateChoice from "./DateChoice";
import ContactFields, { validateContact, type ContactErrors, type ContactValues } from "./ContactFields";
import BookingSummary from "./BookingSummary";
import BookingSuccess from "./BookingSuccess";
import styles from "./BookingFlow.module.css";

const steps = ["Leistungen", "Mitarbeiter", "Datum & Uhrzeit", "Kontakt", "Bestätigen"];

export type BookingFlowProps = {
  services: PublicServiceRead[]; team: PublicTeamMemberRead[]; hours: PublicSalonHoursRead[]; profile: SalonProfile | null;
  initialServiceId?: string; initialMemberId?: string; preview?: boolean; loadFailed?: boolean;
};

export default function BookingFlow({ services: initialServices, team, hours, profile, initialServiceId, initialMemberId, preview = false, loadFailed = false }: BookingFlowProps) {
  const [services, setServices] = useState(initialServices);
  const initialService = services.find(service => service.id === initialServiceId);
  const initialMember = team.find(member => member.id === initialMemberId && member.services.length > 0 && (!initialService || member.services.some(s => s.id === initialService.id)));
  const [selectedIds, setSelectedIds] = useState<string[]>(initialService ? [initialService.id] : []);
  const [memberId, setMemberId] = useState<string | null>(initialMember?.id ?? null);
  const [audience, setAudience] = useState<TargetGroup>(initialService?.target_group ?? (initialMember ? services.find(service => initialMember.services.some(s => s.id === service.id))?.target_group : undefined) ?? (services.some(s => s.target_group === "DAMEN") ? "DAMEN" : "HERREN"));
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(() => {
    const first = addDaysISO(salonToday(), 1);
    return Array.from({ length: 14 }, (_, i) => addDaysISO(first, i)).find(day => hours.some(h => h.day_of_week === weekdayMonday0(day) && h.is_open)) ?? first;
  });
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [contact, setContact] = useState<ContactValues>({ name: "", email: "", phone: "", consent: false });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [result, setResult] = useState<PublicAppointmentRead | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const stepContent = useRef<HTMLDivElement>(null);
  const previousStep = useRef(0);
  const selected = selectedIds.map(id => services.find(service => service.id === id)).filter((service): service is PublicServiceRead => Boolean(service));
  const eligible = team.filter(member => selectedIds.every(id => member.services.some(s => s.id === id)));
  const visibleServices = memberId ? services.filter(service => team.find(member => member.id === memberId)?.services.some(s => s.id === service.id)) : services;
  const memberName = memberId ? team.find(member => member.id === memberId)?.name ?? "Gewähltes Teammitglied" : "Egal, wer zuerst frei ist";
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;
  const blocked = !selected.length || !eligible.length || (step === 2 && (!slot || !availabilityReady));
  const label = submitting ? "Wird gebucht …" : step === 4 ? "Verbindlich buchen" : step === 0 && !selected.length ? "Leistung wählen" : step === 2 && !slot ? "Uhrzeit wählen" : "Weiter";

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      const target = stepContent.current?.querySelector<HTMLElement>("h2, legend") ?? heading.current;
      target?.setAttribute("tabindex", "-1");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [step]);

  function focusFirstError(invalid: ContactErrors) {
    const first = (["name", "email", "phone", "consent"] as const).find(key => invalid[key]);
    if (first) requestAnimationFrame(() => {
      const field = document.getElementById(`booking-${first}`);
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ block: "center", behavior: "instant" });
    });
  }

  useEffect(() => {
    if (result) document.getElementById("booking-success")?.focus();
  }, [result]);

  const onAvailability = useCallback((status: "ready" | "error" | "loading", slots: PublicSlot[]) => {
    setAvailabilityReady(status === "ready");
    if (status === "ready") setSlot(current => current && slots.some(s => s.starts_at === current.starts_at) ? current : null);
  }, []);

  function goStep(nextStep: number) {
    if (submittingRef.current) return;
    if (nextStep === 2) setAvailabilityReady(false);
    setStep(nextStep);
    setErrors({});
    setMessage("");
  }

  function toggleService(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id];
    setSelectedIds(next);
    setSlot(null);
    setAvailabilityReady(false);
    setMessage("");
    if (memberId && !next.every(serviceId => team.find(member => member.id === memberId)?.services.some(s => s.id === serviceId))) {
      setMemberId(null);
      setMessage("Deine Auswahl wurde erweitert. Bitte wähle ein Teammitglied, das alle Leistungen anbietet.");
    }
  }

  async function next() {
    if (blocked || submittingRef.current) return;
    if (step === 3) {
      const invalid = validateContact(contact);
      setErrors(invalid);
      if (Object.keys(invalid).length) { focusFirstError(invalid); return; }
    }
    if (step < 4) { goStep(step + 1); return; }
    if (!slot) return;
    submittingRef.current = true;
    setSubmitting(true);
    setMessage("");
    try {
      const booked: PublicAppointmentRead = preview ? {
        id: "VORSCHAU", service_id: selected[0].id, team_member_id: slot.team_member_id,
        starts_at: slot.starts_at, ends_at: slot.ends_at, status: "confirmed", cancellation_token: "",
        payment_note: "Zahlung vor Ort", selected_services: selected,
      } : await createPublicAppointment({
        service_ids: selectedIds, team_member_id: memberId, starts_at: slot.starts_at,
        customer: { name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim() || undefined },
        privacy_acknowledged: contact.consent,
        expected_total_price_cents: selected.reduce((sum, service) => sum + service.price_cents, 0),
        expected_total_duration_minutes: selected.reduce((sum, service) => sum + service.duration_minutes, 0),
      });
      setResult(booked);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.message === "SELECTION_CHANGED") {
        setSlot(null);
        setAvailabilityReady(false);
        setStep(0);
        try {
          const updated = await getPublicServices();
          setServices(updated);
          setSelectedIds(ids => ids.filter(id => updated.some(service => service.id === id)));
          setMessage("Preise oder Dauer haben sich geändert. Die Liste wurde aktualisiert. Bitte prüfe deine Auswahl und wähle erneut eine passende Uhrzeit. Deine Kontaktdaten bleiben erhalten.");
        } catch {
          setMessage("Preise oder Dauer haben sich geändert. Die aktuelle Liste konnte nicht geladen werden. Bitte lade die Buchung neu oder ruf uns an.");
        }
      } else if (error instanceof ApiError && error.status === 409) {
        setSlot(null);
        setAvailabilityReady(false);
        setStep(2);
        setMessage("Diese Uhrzeit ist inzwischen nicht mehr verfügbar. Bitte wähle einen neuen Termin. Deine übrigen Angaben bleiben erhalten.");
      } else if (error instanceof ApiError && error.status === 422 && ["BOOKING_TOO_SOON", "BOOKING_TOO_FAR", "INVALID_SLOT_TIME"].includes(error.message)) {
        setSlot(null);
        setAvailabilityReady(false);
        setStep(2);
        setMessage("Diese Uhrzeit kann nicht mehr gebucht werden. Bitte wähle einen neuen Termin.");
      } else if (error instanceof ApiError && error.status === 422) {
        setStep(3);
        setMessage("Bitte prüfe deine Angaben. Die Buchung wurde nicht abgeschlossen.");
        setErrors({ email: "Bitte prüfe deine E-Mail-Adresse. Sie muss zustellbar und vollständig sein." });
        focusFirstError({ email: "Bitte prüfe deine E-Mail-Adresse." });
      } else if (error instanceof ApiError && error.status === 404) {
        setStep(0);
        setMessage("Eine gewählte Leistung ist nicht mehr verfügbar. Bitte lade die aktuelle Liste neu oder ruf uns an.");
      } else {
        setMessage(error instanceof ApiError && error.status === 429 ? "Zu viele Buchungsversuche. Bitte warte kurz und versuche es dann erneut." : "Die Buchung konnte nicht bestätigt werden. Bitte prüfe zunächst, ob du eine Bestätigungs-E-Mail erhalten hast, oder ruf im Salon an, bevor du erneut buchst.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (result) return <Container className={`${styles.flow} bg-surface-base font-text text-ink`}><BookingSuccess result={result} services={result.selected_services?.length ? result.selected_services : selected} memberName={team.find(member => member.id === result.team_member_id)?.name ?? slot?.team_member_name ?? "Team Azzam Salon"} name={contact.name} profile={profile} preview={preview} onRestart={() => { setResult(null); setStep(0); setSlot(null); setSelectedIds([]); setMemberId(null); setContact({ name: "", email: "", phone: "", consent: false }); }} /></Container>;

  return (
    <div data-booking-flow className={`${styles.flow} bg-surface-base font-text text-ink`}>
      <nav aria-label="Buchungsnavigation" className="sticky top-0 z-30 grid h-14 grid-cols-[48px_1fr_48px] items-center border-b border-line bg-surface-raise px-2 lg:hidden">
        {step > 0 ? <button type="button" disabled={submitting} aria-label="Vorheriger Buchungsschritt" onClick={() => goStep(step - 1)} className="h-12 w-12 text-xl">←</button> : <Link href="/" aria-label="Zur Startseite" className="flex h-12 w-12 items-center justify-center text-xl">←</Link>}
        <span className="text-center text-base font-bold">Termin buchen</span>
        <Link href="/" aria-label="Buchung verlassen" className="flex h-12 w-12 items-center justify-center text-xl">×</Link>
      </nav>
      <Container className="pb-[calc(14rem+env(safe-area-inset-bottom))] pt-6 lg:pb-16 lg:pt-10">
        {preview && <p className="mb-5 rounded-lg border border-line bg-surface-card px-4 py-3 text-sm leading-6 text-ink-muted">Design-Vorschau: Du kannst den Ablauf prüfen. Es wird keine Buchung gespeichert und keine E-Mail versendet.</p>}
        <h1 ref={heading} tabIndex={-1} className="sr-only scroll-mt-20 font-brand uppercase text-balance lg:not-sr-only lg:text-[56px] lg:leading-[60px]">Termin buchen</h1>
        <ol aria-label="Buchungsschritte" className="mb-8 mt-4 grid grid-cols-5 gap-2 lg:mb-10 lg:mt-6 lg:gap-4">{steps.map((title, index) => <li key={title} aria-current={step === index ? "step" : undefined}>
          <span aria-hidden="true" className={`block h-[3px] rounded-full ${index <= step ? "bg-gold-500" : "bg-line"}`} />
          <span className={`mt-3 hidden min-h-11 items-center text-sm lg:flex ${index === step ? "font-bold text-ink" : index < step ? "text-gold-300" : "text-ink-subtle"}`}>{index + 1}. {title}</span>
        </li>)}</ol>
        <p role="status" className="mb-6 text-sm font-semibold text-ink-muted lg:hidden">Schritt {step + 1} von 5 · {steps[step]}</p>
        {loadFailed || !services.length || !team.length ? <div role="alert" className="rounded-xl border border-danger-line bg-danger-bg p-5 text-danger"><h2 className="font-brand text-[32px] uppercase leading-9">Buchung gerade nicht verfügbar</h2><p className="mt-3 text-sm leading-6">Die benötigten Daten konnten nicht geladen werden. Bitte versuche es erneut oder ruf uns an.</p><div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => window.location.reload()} variant="secondary">Erneut laden</Button>{phoneHref && <Button href={phoneHref} variant="secondary">Anrufen</Button>}</div></div> : <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12 xl:gap-[72px]">
          <div ref={stepContent} className="min-w-0">
            {message && <p role="alert" className="mb-6 rounded-lg border border-danger-line bg-danger-bg p-4 text-sm leading-6 text-danger">{message}</p>}
            {!!selected.length && !eligible.length && <p role="status" className="mb-6 rounded-lg border border-line bg-surface-card p-4 text-sm leading-6 text-ink-muted">Für diese Kombination ist kein gemeinsames Teammitglied verfügbar. Bitte passe deine Leistungen an{phoneHref ? <> oder <a href={phoneHref} className="text-gold-300 underline underline-offset-4">ruf uns an</a></> : ""}.</p>}
            {step === 0 && <ServiceChoice services={visibleServices} selectedIds={selectedIds} audience={audience} onAudience={setAudience} onToggle={toggleService} />}
            {step === 1 && <StaffChoice members={eligible} selected={memberId} onSelect={id => { setMemberId(id); setSlot(null); setAvailabilityReady(false); }} />}
            {step === 2 && <DateChoice serviceIds={selectedIds} memberId={memberId} date={date} selectedSlot={slot} hours={hours} phoneHref={phoneHref} onDate={day => { setDate(day); setSlot(null); setAvailabilityReady(false); }} onSlot={setSlot} onAvailability={onAvailability} />}
            {step === 3 && <ContactFields values={contact} errors={errors} onChange={values => {
              const remaining = { ...errors };
              (["name", "email", "phone", "consent"] as const).forEach(key => { if (values[key] !== contact[key]) delete remaining[key]; });
              setContact(values);
              setErrors(remaining);
            }} />}
            {step === 4 && slot && <div>
              <h2 className="font-brand text-[32px] uppercase leading-9">Alles richtig?</h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted">Prüfe deine Auswahl. Mit „Verbindlich buchen“ reservierst du deinen Termin.</p>
              <div className="mt-6 space-y-4">{[
                { title: "Leistungen", value: <ul className="space-y-2">{selected.map(service => <li key={service.id}>{service.name} · {formatServicePrice(service.price_cents, service.price_is_from)}</li>)}</ul>, target: 0 },
                { title: "Bei", value: memberName, target: 1 },
                { title: "Termin", value: <>{formatSalonDateTimeLong(slot.starts_at)}<br />{selected.reduce((sum, s) => sum + s.duration_minutes, 0)} Min.</>, target: 2 },
                { title: "Kontakt", value: <>{contact.name}<br /><span className="break-all">{contact.email}</span>{contact.phone && <><br />{contact.phone}</>}</>, target: 3 },
              ].map(row => <section key={row.title} className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-card p-4"><div className="min-w-0"><h3 className="text-sm font-bold text-ink-muted">{row.title}</h3><div className="mt-2 text-sm leading-6">{row.value}</div></div><button type="button" disabled={submitting} aria-label={`${row.title} ändern`} onClick={() => goStep(row.target)} className="min-h-12 shrink-0 px-2 text-sm font-semibold text-gold-300 hover:text-ink disabled:cursor-not-allowed">Ändern</button></section>)}</div>
              <p className="mt-5 text-sm leading-6 text-ink-muted">Zahlung vor Ort. Bis 24 Stunden vorher kannst du über deine Bestätigungs-E-Mail absagen.</p>
              {selected.some(s => s.price_is_from) && <p className="mt-3 text-sm leading-6 text-ink-muted">Bei ab-Preisen hängt der Endpreis von Haarlänge und Aufwand ab. Wir besprechen ihn vor Beginn.</p>}
            </div>}
          </div>
          <BookingSummary services={selected} memberName={memberName} slot={slot} step={step} label={label} disabled={blocked} submitting={submitting} onNext={next} onBack={() => goStep(step - 1)} />
        </div>}
      </Container>
    </div>
  );
}
