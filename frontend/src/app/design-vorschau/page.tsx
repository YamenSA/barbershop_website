import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";
import SiteHeader from "@/components/site/SiteHeader";
import BottomBar, { BottomBarSpacer } from "@/components/site/BottomBar";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Design-Vorschau",
  robots: { index: false },
};

export default function DesignVorschauPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
    <SiteHeader phone="Platzhalter" phoneHref="tel:+490000000" />
    <main id="main-content" className="min-h-screen bg-surface-base px-6 py-12 font-text text-ink">
      <h1 className="mb-8 font-brand text-4xl">Button-Vorschau</h1>
      <div className="grid gap-8 sm:grid-cols-2">
        {(["primary", "secondary", "text"] as const).flatMap((variant) =>
          (["md", "lg"] as const).map((size) => (
            <section key={`${variant}-${size}`} className="flex flex-col items-start gap-3">
              <h2 className="text-ink-muted">{variant} · {size}</h2>
              <Button variant={variant} size={size} href="#disabled">
                {variant === "primary" ? "Termin buchen" : variant === "secondary" ? "Preise ansehen" : "Alle Leistungen"}
              </Button>
            </section>
          )),
        )}
        <section id="disabled" className="flex flex-col items-start gap-3">
          <h2 className="text-ink-muted">primary · md · disabled</h2>
          <Button disabled>Termin buchen</Button>
        </section>
      </div>
      <div className="mt-8 h-[150vh] border border-line bg-surface-card p-6 text-ink-muted">
        Platzhalter zum Testen des Scrollens
      </div>
    </main>
    <SiteFooter
      copyrightYear={2026}
      description="Vorschau mit Platzhalterdaten, keine echten Salonangaben."
      profile={{ name: "Platzhalter", street: "Platzhalter-Straße", postal_code: "00000", city: "Platzhalter-Ort", country: "DE", phone: "+49 000 000000" }}
      hours={Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, is_open: day_of_week < 6, open_time: "09:00", close_time: "18:00" }))}
      contactLinks={[{ label: "Kontakt (Vorschau)", href: "/kontakt" }]}
    />
    <BottomBarSpacer />
    <BottomBar />
    </>
  );
}
