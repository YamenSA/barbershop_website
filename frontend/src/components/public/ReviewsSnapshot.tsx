import React from 'react';
import type { ReviewsSnapshot as ReviewsSnapshotType } from '@/lib/types';

interface ReviewsSnapshotProps {
  data: ReviewsSnapshotType;
}

export default function ReviewsSnapshot({ data }: ReviewsSnapshotProps) {
  const { reviews, profileUrl, writeReviewUrl, notice } = data;

  return (
    <div className="w-full space-y-10">
      <div className="text-center md:text-left space-y-3">
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
          Kundenstimmen
        </h2>
        <p className="text-ash text-sm max-w-xl leading-relaxed">
          Feedback von unseren Kunden vor Ort.
        </p>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="flex flex-col justify-between p-6 rounded-card border border-white/[0.06] bg-slate/50 hover:bg-slate hover:border-white/[0.08] transition-all duration-[150ms] group"
          >
            <div className="space-y-4">
              {/* Star Rating (Static 5 Stars) */}
              <div className="flex gap-1 text-brass" aria-label="5 von 5 Sternen">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 transition-transform group-hover:scale-110"
                    style={{ transitionDelay: `${i * 30}ms` }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ))}
              </div>

              {/* Review Text */}
              <blockquote className="text-ink text-sm leading-relaxed font-normal italic">
                &bdquo;{review.text}&ldquo;
              </blockquote>
            </div>

            {/* Reviewer Details */}
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex justify-between items-center text-xs text-ash">
              <span className="font-semibold text-ink">{review.author}</span>
              <time dateTime={review.date}>
                {new Date(review.date).toLocaleDateString('de-DE', {
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            </div>
          </div>
        ))}
      </div>

      {/* Actions & Notice */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/[0.06]">
        <p className="text-ash text-[11px] leading-relaxed max-w-md text-center sm:text-left">
          {notice}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <a
            href={writeReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-center px-4 py-2 bg-brass hover:bg-brass/90 text-midnight font-bold text-xs rounded-btn uppercase tracking-[0.05em] transition-colors duration-[150ms] focus-visible:ring-2 focus-visible:ring-brass"
          >
            Bewertung schreiben
          </a>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-center px-4 py-2 border border-white/10 hover:border-white/20 text-ink font-bold text-xs rounded-btn uppercase tracking-[0.05em] transition-colors duration-[150ms] focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Alle Bewertungen ansehen
          </a>
        </div>
      </div>
    </div>
  );
}
