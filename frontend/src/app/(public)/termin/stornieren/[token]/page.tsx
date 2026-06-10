import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCancellation } from '@/lib/api';
import CancelCard from '@/components/public/booking/CancelCard';
import { ApiError } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Termin stornieren – Azzam Barbershop',
  robots: 'noindex, nofollow',
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CancellationPage({ params }: Props) {
  const { token } = await params;

  try {
    const view = await getCancellation(token);
    
    return (
      <main className="container-page py-12 md:py-20">
        <CancelCard view={view} token={token} />
      </main>
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
