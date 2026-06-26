import Nav from '@/components/public/Nav';
import Footer from '@/components/public/Footer';
import MobileContactBar from '@/components/public/MobileContactBar';

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
