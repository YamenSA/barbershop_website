import Image from 'next/image';
import type { GalleryItem } from '@/lib/types';

interface BeforeAfterGalleryProps {
  items: GalleryItem[];
}

/**
 * T036 — BeforeAfterGallery
 *
 * Design constraints (plan.md + data-model.md):
 * - Only renders items that have passed the consentProofId guard in content.ts
 * - Fixed 4:3 aspect-ratio containers → CLS = 0 (FR-017)
 * - Alt text on every image for a11y (FR-018 / WCAG 2.1 AA)
 * - next/image for automatic optimisation, WebP output
 */
export default function BeforeAfterGallery({ items }: BeforeAfterGalleryProps) {
  if (items.length === 0) {
    return (
      <p className="text-ash text-sm text-center py-12">
        Derzeit sind keine Galerie-Einträge verfügbar.
      </p>
    );
  }

  return (
    <ul
      className="grid gap-6 sm:gap-8"
      aria-label="Vorher / Nachher Galerie"
    >
      {items.map((item, idx) => (
        <li
          key={item.id}
          className="rounded-[8px] border border-hairline bg-slate overflow-hidden shadow-bevel"
        >
          {/* Pair label */}
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-ash text-xs uppercase tracking-[0.08em] font-semibold">
              Transformation {idx + 1}
              {item.publishedAt && (
                <span className="ml-2 font-normal normal-case">
                  — {new Date(item.publishedAt).toLocaleDateString('de-DE', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>

          {/* Before / After grid */}
          <div className="grid grid-cols-2 gap-0">
            {/* Before */}
            <div className="relative">
              {/* Fixed 4:3 aspect ratio → CLS-free */}
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <Image
                  src={item.beforeSrc}
                  alt={`Vorher: ${item.alt}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                  priority={idx === 0}
                />
              </div>
              {/* Label overlay */}
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-midnight/80 text-ash text-[10px] font-bold uppercase tracking-[0.08em] rounded">
                Vorher
              </span>
            </div>

            {/* After */}
            <div className="relative border-l border-white/[0.06]">
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <Image
                  src={item.afterSrc}
                  alt={`Nachher: ${item.alt}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                  priority={idx === 0}
                />
              </div>
              <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-malachite/90 text-midnight text-[10px] font-bold uppercase tracking-[0.08em] rounded">
                Nachher
              </span>
            </div>
          </div>

          {/* Alt caption for screen readers & SEO */}
          <p className="px-5 py-3 text-ash text-xs leading-relaxed border-t border-white/[0.06]">
            {item.alt}
          </p>
        </li>
      ))}
    </ul>
  );
}
