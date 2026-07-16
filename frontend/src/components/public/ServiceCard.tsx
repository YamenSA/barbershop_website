import type { PublicServiceRead } from '@/lib/types';

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
  }
  return `${minutes} Min.`;
}

export default function ServiceCard({ service }: { service: PublicServiceRead }) {
  return (
    <article className="bg-slate rounded-[8px] p-6 flex flex-col gap-4 border border-hairline shadow-bevel">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display font-bold text-xl leading-tight tracking-[-0.02em] text-ink">
          {service.name}
        </h3>
        <span
          className="shrink-0 px-2.5 py-1 rounded-[4px] text-sm font-semibold tabular-nums"
          style={{
            background: 'oklch(0.88 0.12 55 / 0.12)',
            color: 'oklch(0.88 0.12 55)',
          }}
        >
          {formatPrice(service.price_cents)}
        </span>
      </div>

      <p className="text-ash text-sm">
        {formatDuration(service.duration_minutes)}
      </p>

      {service.description && (
        <p className="text-ash text-sm leading-relaxed max-w-[60ch]">
          {service.description}
        </p>
      )}
    </article>
  );
}
