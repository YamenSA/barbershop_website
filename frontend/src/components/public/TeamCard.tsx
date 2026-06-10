import Image from 'next/image';
import type { PublicTeamMemberRead } from '@/lib/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function AvatarPlaceholder({ name }: { name: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: 'oklch(0.20 0.008 140)' }}
      aria-hidden="true"
    >
      <span className="font-display font-bold text-4xl text-ash select-none">
        {getInitials(name)}
      </span>
    </div>
  );
}

export default function TeamCard({
  member,
  priority = false,
}: {
  member: PublicTeamMemberRead;
  priority?: boolean;
}) {
  return (
    <article className="bg-slate rounded-[8px] overflow-hidden flex flex-col">
      <div className="relative aspect-[3/2]">
        {member.photo_url ? (
          <Image
            src={member.photo_url}
            alt={member.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <AvatarPlaceholder name={member.name} />
        )}
      </div>

      <div className="p-6 flex flex-col gap-3 flex-1">
        <h3 className="font-display font-bold text-xl leading-tight tracking-[-0.02em] text-ink">
          {member.name}
        </h3>

        {member.bio && (
          <p className="text-ash text-sm leading-relaxed">{member.bio}</p>
        )}

        {member.services.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-auto pt-2" aria-label="Angebotene Dienstleistungen">
            {member.services.map((s) => (
              <li
                key={s.id}
                className="px-2.5 py-1 text-xs text-ash rounded-[4px]"
                style={{ background: 'oklch(0.20 0.008 140)' }}
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
