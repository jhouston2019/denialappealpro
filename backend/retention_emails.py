"""
SMTP helpers for retention / reactivation campaigns.
Configure: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM (or MAIL_FROM).
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional


def _smtp_config():
    host = os.getenv("SMTP_HOST") or os.getenv("MAIL_SERVER")
    port = int(os.getenv("SMTP_PORT") or os.getenv("MAIL_PORT") or "587")
    user = os.getenv("SMTP_USER") or os.getenv("MAIL_USERNAME")
    password = os.getenv("SMTP_PASSWORD") or os.getenv("MAIL_PASSWORD")
    from_addr = os.getenv("SMTP_FROM") or os.getenv("MAIL_FROM") or user
    return host, port, user, password, from_addr


def send_html_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    host, port, user, password, from_addr = _smtp_config()
    if not host or not from_addr:
        print("Retention email skipped: SMTP_HOST / SMTP_FROM not configured")
        return False
    text_body = text_body or subject
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo()
            if user and password:
                smtp.starttls()
                smtp.ehlo()
                smtp.login(user, password)
            smtp.sendmail(from_addr, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"Retention email send failed: {e}")
        return False


def app_base_url() -> str:
    return (os.getenv("FRONTEND_URL") or os.getenv("DOMAIN") or "http://localhost:3000").rstrip("/")
