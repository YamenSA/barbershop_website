import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
_TIMEOUT_SECONDS = 10.0


@dataclass
class EmailMessage:
    to: str
    subject: str
    html_body: str


def send_email(msg: EmailMessage) -> None:
    if not settings.BREVO_API_KEY:
        logger.info(
            "[EMAIL CONSOLE] To: %s | Subject: %s\n%s",
            msg.to,
            msg.subject,
            msg.html_body,
        )
        return

    headers = {
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json",
    }
    payload = {
        "sender": {"email": settings.EMAIL_FROM, "name": settings.EMAIL_FROM_NAME},
        "to": [{"email": msg.to}],
        "replyTo": {"email": settings.EMAIL_REPLY_TO},
        "subject": msg.subject,
        "htmlContent": msg.html_body,
    }

    with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
        response = client.post(BREVO_API_URL, headers=headers, json=payload)

    # Brevo returns 201 Created on success.
    if response.status_code != 201:
        raise RuntimeError(
            f"Brevo responded {response.status_code}: {response.text}"
        )
