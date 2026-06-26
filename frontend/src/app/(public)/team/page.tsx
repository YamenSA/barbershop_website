import type { Metadata } from 'next';
import { getPublicTeamMembers } from '@/lib/api';
import TeamCard from '@/components/public/TeamCard';
import EmptyState from '@/components/public/EmptyState';
import BookingCta from '@/components/public/BookingCta';

export const metadata: Metadata = {
  title: 'Unser Team — Barbiere in Cottbus',
  description:
    'Lernen Sie das Friseur-Team des Azzam Barbershop in Cottbus kennen — erfahrene Barbiere mit Leidenschaft für Präzision, Fade und klassische Rasur.',
};

export const revalidate = 60;

export default async function TeamPage() {
  const members = await getPublicTeamMembers().catch(() => []);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1
            className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Unser Team
          </h1>
          <p className="text-secondary text-lg leading-relaxed max-w-[55ch]">
            Erfahrene Barbiere — jeder mit eigenem Stil, alle mit dem gleichen Anspruch
            an Präzision.
          </p>
        </div>

        {members.length === 0 ? (
          <EmptyState
            title="Team wird bald vorgestellt"
            description="Wir stellen unser Team in Kürze hier vor. Schauen Sie bald wieder vorbei."
            action={<BookingCta />}
          />
        ) : (
          <>
            <ul
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16"
              aria-label="Teammitglieder"
            >
              {members.map((member, index) => (
                <li key={member.id}>
                  <TeamCard member={member} priority={index === 0} />
                </li>
              ))}
            </ul>

            <div className="flex justify-center">
              <BookingCta />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
