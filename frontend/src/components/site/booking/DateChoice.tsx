"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { getBookingDays, getCombinedAvailability } from "@/lib/combined-booking";
import { addDaysISO, formatDateOnly, formatSalonTime, salonToday, weekdayMonday0 } from "@/lib/time";
import type { PublicSalonHoursRead, PublicSlot } from "@/lib/types";

type Resource = { key: string; status: "ready" | "error"; slots: PublicSlot[] };

export default function DateChoice({ serviceIds, memberId, date, selectedSlot, hours, phoneHref, onDate, onSlot, onAvailability }: {
  serviceIds: string[]; memberId: string | null; date: string; selectedSlot: PublicSlot | null;
  hours: PublicSalonHoursRead[]; phoneHref?: string; onDate: (date: string) => void; onSlot: (slot: PublicSlot) => void;
  onAvailability: (status: "ready" | "error" | "loading", slots: PublicSlot[]) => void;
}) {
  const firstDay = addDaysISO(salonToday(), 1);
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(firstDay, i));
  const lastDay = days[13];
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [resource, setResource] = useState<Resource | null>(null);
  const [retry, setRetry] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const alive = useRef(true);
  const idsKey = serviceIds.join(",");
  const key = `${idsKey}|${memberId ?? "any"}|${date}|${retry}`;
  const status = resource?.key === key ? resource.status : "loading";
  const slots = resource?.key === key && resource.status === "ready" ? resource.slots : [];
  const uniqueSlots = slots.filter((slot, index) => slots.findIndex(other => other.starts_at === slot.starts_at) === index);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getBookingDays(firstDay, lastDay).then(data => {
      if (active) setOpenDays(Object.fromEntries(data.map(day => [day.date, day.is_open])));
    }).catch(() => { /* Slot requests still enforce closures if day metadata fails. */ });
    return () => { active = false; };
  }, [firstDay, lastDay]);

  useEffect(() => {
    let active = true;
    getCombinedAvailability({ serviceIds: idsKey.split(","), memberId, date })
      .then(data => { if (active) { setResource({ key, status: "ready", slots: data.slots }); onAvailability("ready", data.slots); } })
      .catch(() => { if (active) { setResource({ key, status: "error", slots: [] }); onAvailability("error", []); } });
    return () => { active = false; };
  }, [idsKey, memberId, date, key, onAvailability]);

  function isClosed(day: string) {
    return openDays[day] === false || hours.some(h => h.day_of_week === weekdayMonday0(day) && !h.is_open);
  }

  async function findNextDay() {
    setSearching(true);
    setSearchMessage("");
    try {
      for (const day of days.filter(day => day > date && !isClosed(day))) {
        const result = await getCombinedAvailability({ serviceIds, memberId, date: day });
        if (!alive.current) return;
        if (result.slots.length) {
          onDate(day);
          setSearchMessage(`Freie Zeiten am ${formatDateOnly(day, { weekday: "long", day: "numeric", month: "long" })}.`);
          return;
        }
      }
      if (alive.current) setSearchMessage("In den verbleibenden angezeigten Tagen ist kein freier Termin verfügbar. Ruf uns gern an.");
    } catch {
      if (alive.current) setSearchMessage("Die Suche konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
    } finally {
      if (alive.current) setSearching(false);
    }
  }

  return (
    <div>
      <h2 className="font-brand text-[32px] uppercase leading-9">Wann passt es dir?</h2>
      <p className="mt-3 text-sm leading-6 text-ink-muted">Alle Zeiten gelten für den Salon in Berlin-Zeit. Der gesamte Besuch muss in den freien Zeitraum passen.</p>
      <div role="group" aria-label="Datum wählen" className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map(day => <button key={day} type="button" disabled={isClosed(day)} aria-pressed={day === date} aria-label={`${formatDateOnly(day, { weekday: "long", day: "numeric", month: "long" })}${isClosed(day) ? ", geschlossen" : ""}`} onClick={() => { onDate(day); setSearchMessage(""); }} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-sm tabular-nums ${isClosed(day) ? "cursor-not-allowed border-dashed border-line text-ink-disabled" : day === date ? "border-ink bg-ink text-surface-pitch" : "border-line-control bg-surface-card hover:bg-surface-hover"}`}>
          <span className="text-xs">{formatDateOnly(day, { weekday: "short" })}</span>
          <span className="text-xl font-bold">{formatDateOnly(day, { day: "numeric" })}</span>
          <span className="text-xs">{isClosed(day) ? "zu" : formatDateOnly(day, { month: "short" })}</span>
        </button>)}
      </div>
      <h3 className="mt-7 text-base font-semibold">{formatDateOnly(date, { weekday: "long", day: "numeric", month: "long" })}</h3>
      <div className="mt-4" aria-busy={status === "loading"}>
        {status === "loading" && <><p role="status" className="mb-3 text-sm text-ink-muted">Freie Zeiten werden geladen …</p><div aria-hidden="true" className="grid grid-cols-3 gap-2 lg:grid-cols-4">{Array.from({ length: 12 }, (_, i) => <div key={i} className="h-[52px] rounded-lg border border-line bg-surface-card motion-safe:animate-pulse" />)}</div></>}
        {status === "error" && <div role="alert" className="rounded-lg border border-danger-line bg-danger-bg p-4 text-danger"><p className="text-sm leading-6">Zeiten konnten nicht geladen werden. Deine Auswahl bleibt erhalten.</p><Button variant="secondary" className="mt-3" onClick={() => { onAvailability("loading", []); setRetry(value => value + 1); }}>Erneut versuchen</Button></div>}
        {status === "ready" && uniqueSlots.length === 0 && <div className="rounded-xl border border-line bg-surface-card p-5">
          <h4 className="font-semibold">{isClosed(date) ? "Der Salon ist an diesem Tag geschlossen." : "Keine freien Termine an diesem Tag."}</h4>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Wähle einen anderen Tag oder lass uns nach dem nächsten freien Tag suchen.</p>
          <Button disabled={searching} variant="secondary" className="mt-4 w-full sm:w-auto" onClick={findNextDay}>{searching ? "Freien Tag suchen …" : "Zum nächsten freien Tag"}</Button>
          {phoneHref && <a href={phoneHref} className="mt-2 inline-flex min-h-12 items-center text-sm text-gold-300 underline underline-offset-4">Im Salon anrufen</a>}
        </div>}
        {status === "ready" && uniqueSlots.length > 0 && <div className="space-y-6">{["Vormittag", "Nachmittag"].map((label, group) => {
          const groupSlots = uniqueSlots.filter(slot => (Number(formatSalonTime(slot.starts_at).slice(0, 2)) < 12 ? 0 : 1) === group);
          if (!groupSlots.length) return null;
          return <fieldset key={label}><legend className="mb-3 text-sm font-semibold text-ink-muted">{label} · {groupSlots.length} frei</legend><div className="grid grid-cols-3 gap-2 lg:grid-cols-4">{groupSlots.map(slot => <button key={slot.starts_at} type="button" aria-pressed={selectedSlot?.starts_at === slot.starts_at} aria-label={`${formatSalonTime(slot.starts_at)} Uhr`} onClick={() => onSlot(slot)} className={`h-[52px] rounded-lg border text-base font-semibold tabular-nums ${selectedSlot?.starts_at === slot.starts_at ? "border-gold-500 bg-gold-500 text-surface-pitch" : "border-line-control bg-surface-card hover:bg-surface-hover"}`}>
            {selectedSlot?.starts_at === slot.starts_at && <span aria-hidden="true">✓ </span>}{formatSalonTime(slot.starts_at)}
          </button>)}</div></fieldset>;
        })}</div>}
      </div>
      {searchMessage && <p role="status" className="mt-4 text-sm leading-6 text-ink-muted">{searchMessage}</p>}
    </div>
  );
}
