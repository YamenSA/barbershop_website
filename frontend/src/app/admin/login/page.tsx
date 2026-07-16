import { redirect } from 'next/navigation';

// Der Admin-Login wurde in den vereinheitlichten Login ("Mein Konto") überführt.
// Diese Route bleibt nur als Weiterleitung für alte Lesezeichen erhalten.
export default function AdminLoginRedirect() {
  redirect('/konto/login');
}
