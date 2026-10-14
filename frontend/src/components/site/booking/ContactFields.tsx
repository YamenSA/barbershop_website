import Link from "next/link";

export type ContactValues = { name: string; email: string; phone: string; consent: boolean };
export type ContactErrors = Partial<Record<"name" | "email" | "phone" | "consent", string>>;

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.name.trim() || values.name.trim().length > 100) errors.name = "Bitte gib deinen Namen an (höchstens 100 Zeichen).";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(values.email.trim())) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (values.phone.length > 50) errors.phone = "Bitte prüfe deine Telefonnummer (höchstens 50 Zeichen).";
  if (!values.consent) errors.consent = "Bitte bestätige die Datenschutzerklärung.";
  return errors;
}

export default function ContactFields({ values, errors, onChange }: { values: ContactValues; errors: ContactErrors; onChange: (values: ContactValues) => void }) {
  const fields = [
    { key: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Dein Name", maxLength: 100 },
    { key: "email", label: "E-Mail-Adresse", type: "email", autoComplete: "email", placeholder: "name@beispiel.de", maxLength: 254 },
    { key: "phone", label: "Telefon (optional)", type: "tel", autoComplete: "tel", placeholder: "+49 …", maxLength: 50 },
  ] as const;
  return (
    <div>
      <h2 className="font-brand text-[32px] uppercase leading-9">Wie erreichen wir dich?</h2>
      <p className="mt-3 text-sm leading-6 text-ink-muted">An diese E-Mail-Adresse schicken wir dir die Bestätigung und deinen Absage-Link.</p>
      {Object.keys(errors).length > 0 && <p role="alert" className="mt-6 rounded-lg border border-danger-line bg-danger-bg p-4 text-sm leading-6 text-danger">Bitte prüfe {Object.keys(errors).length} markierte {Object.keys(errors).length === 1 ? "Angabe" : "Angaben"}.</p>}
      <div className="mt-6 space-y-5">{fields.map(field => <div key={field.key}>
        <label htmlFor={`booking-${field.key}`} className="mb-2 block text-sm font-semibold">{field.label}{field.key !== "phone" && <span aria-hidden="true"> *</span>}</label>
        <input id={`booking-${field.key}`} type={field.type} autoComplete={field.autoComplete} required={field.key !== "phone"} maxLength={field.maxLength} value={values[field.key]} onChange={event => onChange({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `booking-${field.key}-error` : undefined} className={`h-[52px] w-full scroll-mb-56 rounded-lg border-[1.5px] bg-surface-base px-4 text-base ${errors[field.key] ? "border-danger" : "border-line-control"}`} />
        {errors[field.key] && <p id={`booking-${field.key}-error`} className="mt-2 text-sm text-danger">{errors[field.key]}</p>}
      </div>)}</div>
      <div className="mt-6">
        <div className="flex items-start gap-3">
          <input id="booking-consent" type="checkbox" required checked={values.consent} onChange={event => onChange({ ...values, consent: event.target.checked })} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "booking-consent-error" : undefined} className="mt-1 h-6 w-6 shrink-0 scroll-mb-56" />
          <div className="text-sm leading-6 text-ink-muted"><label htmlFor="booking-consent" className="cursor-pointer">Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Daten zur Terminverwaltung zu.</label>{" "}<Link href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-gold-300 underline underline-offset-4">Datenschutzerklärung öffnen<span className="sr-only"> (neuer Tab)</span></Link></div>
        </div>
        {errors.consent && <p id="booking-consent-error" className="mt-2 text-sm text-danger">{errors.consent}</p>}
      </div>
      <p className="mt-5 text-xs leading-5 text-ink-subtle">* Pflichtfelder. Keine Online-Zahlung, bezahlt wird bar vor Ort.</p>
    </div>
  );
}
