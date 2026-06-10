'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative background video for the Hero section.
 * - Desktop: autoplaying, muted, looping video behind the content.
 * - Mobile (< 768px): video hidden, plain black background shown instead.
 * - prefers-reduced-motion: video paused and hidden, plain black background shown.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (reduceMotion.matches) {
        video.pause();
      } else {
        video.play().catch(() => {
          /* autoplay can be blocked; ignore */
        });
      }
    };

    apply();
    reduceMotion.addEventListener('change', apply);
    return () => reduceMotion.removeEventListener('change', apply);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 bg-black" aria-hidden="true">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/images/hero-bg.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}
