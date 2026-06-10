import type { Metadata } from 'next';
import Nav from '@/components/public/Nav';
import Footer from '@/components/public/Footer';
import BookingCta from '@/components/public/BookingCta';
import HeroVideo from '@/components/public/HeroVideo';

export const metadata: Metadata = {
  title: { absolute: 'Azzam Barbershop' },
  description:
    'Präzise Schnitte, professionelle Bartpflege und klassische Fades — Ihr Barbershop in Berlin.',
};

export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Zum Inhalt springen
      </a>
      <Nav />
      <main id="main-content" className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-20 min-h-[80svh]">
          <HeroVideo />
          <div className="max-w-7xl mx-auto w-full">
            <h1
              className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink text-balance mb-6"
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
            >
              Präzision.
              <br />
              Jeder Schnitt.
            </h1>
            <p className="text-ash text-lg leading-relaxed max-w-[55ch] mb-10 text-pretty">
              Herrenhaarschnitt, Bartpflege und Fade — handwerklich
              präzise, ohne Kompromisse.
            </p>
            <BookingCta />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
