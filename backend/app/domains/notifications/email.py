import logging
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    to: str
    subject: str
    html_body: str


def send_email(msg: EmailMessage) -> None:
    if not settings.SENDGRID_API_KEY:
        logger.info(
            "[EMAIL CONSOLE] To: %s | Subject: %s\n%s",
            msg.to,
            msg.subject,
            msg.html_body,
        )
        return

    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    mail = Mail(
        from_email=settings.EMAIL_FROM,
        to_emails=msg.to,
        subject=msg.subject,
        html_content=msg.html_body,
    )
    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    response = sg.send(mail)
    if response.status_code not in (200, 202):
        raise RuntimeError(f"SendGrid responded {response.status_code}: {response.body}")
