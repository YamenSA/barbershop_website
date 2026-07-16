'use client';

import { useId, useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Classes for the underlying <input>. Right padding for the toggle is added automatically. */
  className?: string;
};

/**
 * Passwort-Feld mit Sichtbarkeits-Umschalter.
 * Der „Auge"-Button schaltet zwischen maskierter und Klartext-Eingabe um,
 * ohne den Eingabewert oder den Fokus zu verlieren. Voll tastaturbedienbar
 * (eigener Button mit aria-pressed + aussagekräftigem aria-label).
 */
export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const fallbackId = useId();
  const inputId = props.id ?? fallbackId;

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        aria-pressed={visible}
        aria-controls={inputId}
        className="absolute inset-y-1 right-1 flex items-center justify-center rounded-md px-2.5 text-stone-400 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:text-stone-700"
      >
        {visible ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
