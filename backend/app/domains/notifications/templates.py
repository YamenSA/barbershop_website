from datetime import datetime

from app.core.config import settings


def _fmt(dt: datetime) -> str:
    return dt.strftime("%d.%m.%Y um %H:%M Uhr")


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
<p><strong>Zahlung:</strong> Bar vor Ort</p>
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
<p><strong>Zahlung:</strong> Bar vor Ort</p>
<p>Wir freuen uns auf Ihren Besuch!</p>
<p>Mit freundlichen Grüßen,<br>Ihr Azzam Barbershop-Team</p>"""
    return subject, body
