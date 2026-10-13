import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Datenschutzerklärung | Azzam Barbershop' },
  description:
    'Informationen zur Verarbeitung personenbezogener Daten auf dieser Website.',
  robots: { index: false },
};

export const revalidate = 3600;

export { default } from '@/components/legal/DatenschutzContent';
