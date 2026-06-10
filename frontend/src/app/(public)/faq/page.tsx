import type { Metadata } from 'next';
import { faqs } from '@/content/faq';
import BookingCta from '@/components/public/BookingCta';

export const metadata: Metadata = {
  title: 'Häufige Fragen (FAQ)',
  description:
    'Antworten auf die häufigsten Fragen zu Terminen, Preisen, Zahlungsmethoden und unserem Angebot.',
};

export const revalidate = 3600;

export default function FaqPage() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-4"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          Häufige Fragen
        </h1>
        <p className="text-ash text-lg leading-relaxed max-w-[55ch] mb-12">
          Hier finden Sie Antworten auf die wichtigsten Fragen rund um Termin,
          Angebot und Ablauf.
        </p>

        <div>
          {faqs.map((item) => (
            <details
              key={item.id}
              className="group border-b border-[oklch(0.95_0.004_140/0.08)]"
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-ink font-semibold hover:text-malachite transition-colors duration-[150ms] focus-visible:outline-none"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-ash text-xl leading-none transition-transform duration-[150ms] group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 text-ash text-sm leading-relaxed max-w-[65ch]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-14 pt-10 border-t border-[oklch(0.95_0.004_140/0.08)]">
          <p className="text-ash mb-6">
            Noch Fragen? Rufen Sie uns einfach an oder buchen Sie direkt online.
          </p>
          <BookingCta />
        </div>
      </div>
    </section>
  );
}
