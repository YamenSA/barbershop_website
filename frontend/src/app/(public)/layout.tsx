import Nav from '@/components/public/Nav';
import Footer from '@/components/public/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Zum Inhalt springen
      </a>
      <Nav />
      <main id="main-content" className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </>
  );
}
