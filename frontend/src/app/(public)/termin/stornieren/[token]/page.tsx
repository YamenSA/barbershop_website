import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCancellation } from '@/lib/api';
import CancelCard from '@/components/public/booking/CancelCard';
import { ApiError } from '@/lib/api';
import Container from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Termin stornieren – Azzam Barbershop',
  robots: 'noindex, nofollow',
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CancellationPage({ params }: Props) {
  const { token } = await params;

  let view: Awaited<ReturnType<typeof getCancellation>>;
  try {
    view = await getCancellation(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
  return (
      <Container className="py-10 lg:py-16">
      <CancelCard view={view} token={token} />
      </Container>
  );
}
