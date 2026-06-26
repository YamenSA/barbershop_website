from datetime import datetime

from app.core.config import settings


def _fmt(dt: datetime) -> str:
    return dt.strftime("%d.%m.%Y um %H:%M Uhr")


def render_verification(*, customer_name: str, token: str) -> tuple[str, str]:
    verify_url = f"{settings.PUBLIC_BASE_URL}/konto/verifizieren/{token}"
    subject = "E-Mail-Adresse bestätigen – Azzam Barbershop"
    body = f"""<p>Hallo {customer_name},</p>
<p>Bitte bestätigen Sie Ihre E-Mail-Adresse durch Klick auf den folgenden Link:</p>
<p><a href="{verify_url}">E-Mail-Adresse bestätigen</a></p>
<p>Der Link ist 24 Stunden gültig.</p>
<p>Falls Sie kein Konto bei uns angelegt haben, können Sie diese E-Mail ignorieren.</p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body


def render_password_reset(*, customer_name: str, token: str) -> tuple[str, str]:
    reset_url = f"{settings.PUBLIC_BASE_URL}/konto/passwort-zuruecksetzen/{token}"
    subject = "Passwort zurücksetzen – Azzam Barbershop"
    body = f"""<p>Hallo {customer_name},</p>
<p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
<p><a href="{reset_url}">Passwort zurücksetzen</a></p>
<p>Der Link ist 1 Stunde gültig. Falls Sie keine Anfrage gestellt haben, können Sie diese E-Mail ignorieren.</p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body


def render_reschedule_confirmation(
    *,
    customer_name: str,
    service_name: str,
    team_member_name: str,
    starts_at: datetime,
    cancellation_token: str,
) -> tuple[str, str]:
    cancel_url = f"{settings.PUBLIC_BASE_URL}/termin/stornieren/{cancellation_token}"
    subject = "Ihr Termin wurde umgebucht – Azzam Barbershop"
    body = f"""<p>Hallo {customer_name},</p>
<p>Ihr Termin wurde erfolgreich umgebucht:</p>
<ul>
  <li><strong>Dienstleistung:</strong> {service_name}</li>
  <li><strong>Stylist:</strong> {team_member_name}</li>
  <li><strong>Neuer Termin:</strong> {_fmt(starts_at)}</li>
</ul>
<p><strong>Zahlung:</strong> Vor Ort (bar oder Karte)</p>
<p>Möchten Sie den Termin stornieren? Das ist bis 24 Stunden vorher möglich:
<br><a href="{cancel_url}">Termin stornieren</a></p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body


def render_duplicate_register(*, customer_name: str) -> tuple[str, str]:
    subject = "Anmeldeversuch – Azzam Barbershop"
    body = f"""<p>Hallo {customer_name},</p>
<p>Für diese E-Mail-Adresse existiert bereits ein verifiziertes Konto.</p>
<p>Falls Sie Ihr Passwort vergessen haben, nutzen Sie bitte die Passwort-vergessen-Funktion.</p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body


def render_confirmation(
    *,
    customer_name: str,
    service_name: str,
    team_member_name: str,
    starts_at: datetime,
    cancellation_token: str,
) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    cancel_url = f"{settings.PUBLIC_BASE_URL}/termin/stornieren/{cancellation_token}"
    subject = "Ihre Terminbestätigung – Azzam Barbershop"
    body = f"""<p>Hallo {customer_name},</p>
<p>Ihr Termin wurde erfolgreich gebucht:</p>
<ul>
  <li><strong>Dienstleistung:</strong> {service_name}</li>
  <li><strong>Stylist:</strong> {team_member_name}</li>
  <li><strong>Datum / Uhrzeit:</strong> {_fmt(starts_at)}</li>
</ul>
<p><strong>Zahlung:</strong> Vor Ort (bar oder Karte)</p>
<p>
  Möchten Sie den Termin stornieren? Das ist bis 24 Stunden vor dem Termin möglich:
  <br><a href="{cancel_url}">Termin stornieren</a>
</p>
<p>Bei Fragen erreichen Sie uns telefonisch im Salon.<br>
Wir freuen uns auf Ihren Besuch!</p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body


def render_reminder(
    *,
    customer_name: str,
    service_name: str,
    team_member_name: str,
    starts_at: datetime,
) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    subject = "Erinnerung: Ihr Termin morgen – Azzam Barbershop"
    body = f"""<p>Hallo {customer_name},</p>
<p>Wir erinnern Sie an Ihren Termin morgen:</p>
<ul>
  <li><strong>Dienstleistung:</strong> {service_name}</li>
  <li><strong>Stylist:</strong> {team_member_name}</li>
  <li><strong>Datum / Uhrzeit:</strong> {_fmt(starts_at)}</li>
</ul>
<p><strong>Zahlung:</strong> Vor Ort (bar oder Karte)</p>
<p>Wir freuen uns auf Ihren Besuch!</p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body
