import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Impressum | Azzam Barbershop' },
  description: 'Gesetzliche Anbieterkennzeichnung gemäß § 5 DDG.',
  robots: { index: false },
};

export const revalidate = 3600;

export { default } from '@/components/legal/ImpressumContent';
