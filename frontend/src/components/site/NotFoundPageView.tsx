import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import InfoPageShell, { type InfoPageData } from "./InfoPageShell";

export default function NotFoundPageView(data: InfoPageData) {
  return (
    <InfoPageShell {...data}>
      <Container className="py-10 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
          <div aria-hidden="true" className="mx-auto flex h-[220px] w-[170px] items-center justify-center rounded-arch border border-gold-500 font-brand text-[100px] leading-none text-gold-300 lg:col-span-4 lg:h-[380px] lg:w-full lg:max-w-[300px] lg:text-[144px]">404</div>
          <div className="text-center lg:col-span-6 lg:col-start-6 lg:text-left">
            <h1 className="font-brand text-[40px] uppercase leading-[44px] text-balance lg:text-[72px] lg:leading-[76px]">Hier ist nichts im Spiegel</h1>
            <p className="mt-4 text-base leading-7 text-ink-muted lg:text-lg">Die Seite gibt es nicht (mehr). Vielleicht hilft dir das weiter:</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button href="/termin" size="lg">Termin buchen</Button>
              <Button href="/" variant="secondary" size="lg">Zur Startseite</Button>
            </div>
          </div>
        </div>
      </Container>
    </InfoPageShell>
  );
}
