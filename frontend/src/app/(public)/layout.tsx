import Nav from '@/components/public/Nav';
import Footer from '@/components/public/Footer';
import MobileContactBar from '@/components/public/MobileContactBar';

// Der globale <Footer /> ist eine async Server Component und holt bei jedem Render
// live Salon-Daten vom Backend (getPublicSalonProfile/-Hours). Beim statischen
// Prerender zur Build-Zeit läuft das Backend nicht → der Fetch hängt bis zum Timeout
// und der Build bricht ab. Da der Footer jede (public)-Unterseite umhüllt, betrifft
// das ALLE sieben Seiten. force-dynamic auf dem Layout rendert den gesamten Teilbaum
// zur Laufzeit (wenn das Backend erreichbar ist) und verhindert das Build-Prerendering.
export const dynamic = 'force-dynamic';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main id="main-content" className="flex-1 flex flex-col pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileContactBar />
    </>
  );
}
