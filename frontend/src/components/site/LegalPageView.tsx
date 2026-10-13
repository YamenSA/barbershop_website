import Container from "@/components/ui/Container";
import ImpressumContent, { sections as imprintSections } from "@/components/legal/ImpressumContent";
import DatenschutzContent, { sections as privacySections } from "@/components/legal/DatenschutzContent";
import type { InfoPageData } from "./InfoPageShell";
import SitePageFrame from "./SitePageFrame";
import styles from "./LegalPageView.module.css";

export default function LegalPageView({ kind, embedded = false, ...data }: InfoPageData & { kind: "impressum" | "datenschutz"; embedded?: boolean }) {
  const sections = kind === "impressum" ? imprintSections : privacySections;
  const navigation = <nav aria-label="Inhaltsverzeichnis"><ul className="space-y-1">{sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="inline-flex min-h-11 items-center py-2 text-sm leading-6 text-ink-muted hover:text-gold-300">{section.label}</a></li>)}</ul></nav>;
  return (
    <SitePageFrame {...data} embedded={embedded}>
      <Container className="py-8 lg:pb-24 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-8">
              <h2 className="mb-3 text-sm font-bold text-gold-300">Auf dieser Seite</h2>
              {navigation}
            </div>
          </aside>
          <div className="min-w-0 lg:col-span-8 lg:col-start-5">
            <details className="mb-6 border-y border-line lg:hidden">
              <summary className="cursor-pointer py-4 text-sm font-semibold text-gold-300">Inhaltsverzeichnis</summary>
              <div className="pb-4">{navigation}</div>
            </details>
            <article className={styles.content} data-legal-content>
              {kind === "impressum" ? <ImpressumContent /> : <DatenschutzContent />}
            </article>
          </div>
        </div>
      </Container>
    </SitePageFrame>
  );
}
