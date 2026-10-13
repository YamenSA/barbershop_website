import type { PublicAppointmentRead, SalonProfile } from "./types";

const escapeValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
// RFC 5545 UTC timestamps; no browser-local date or wall-clock conversion.
const timestamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

function foldLine(value: string) {
  const lines: string[] = [];
  let line = "";
  const encoder = new TextEncoder();
  for (const character of value) {
    if (encoder.encode(line + character).length > 75) {
      lines.push(line);
      line = " ";
    }
    line += character;
  }
  return [...lines, line].join("\r\n");
}

export function appointmentCalendar(result: PublicAppointmentRead, serviceNames: string[], profile: SalonProfile | null): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Azzam Salon//Termin//DE", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${escapeValue(result.id)}@azzam-salon.de`, `DTSTAMP:${timestamp(new Date().toISOString())}`,
    `DTSTART:${timestamp(result.starts_at)}`, `DTEND:${timestamp(result.ends_at)}`,
    `SUMMARY:${escapeValue(`Azzam Salon: ${serviceNames.join(" + ")}`)}`,
    ...(profile ? [`LOCATION:${escapeValue(`${profile.street}, ${profile.postal_code} ${profile.city}`)}`] : []),
    "DESCRIPTION:Barzahlung vor Ort. Absage bis 24 Stunden vorher über den Link in deiner Bestätigungs-E-Mail.",
    "END:VEVENT", "END:VCALENDAR", "",
  ].map(foldLine).join("\r\n");
}
