"""Async email service with aiosmtplib + console fallback.

When SMTP is configured (smtp_host is non-empty), sends real email.
Otherwise, logs the reset link to stdout — suitable for local development
and testing without an SMTP server.
"""

from email.message import EmailMessage

from src.core.config import get_settings
from src.core.logger import get_logger

logger = get_logger(__name__)


class EmailService:
    """Send password reset emails via SMTP or console fallback.

    SMTP mode requires these config values:
        smtp_host, smtp_port, smtp_username, smtp_password

    Console mode activates automatically when smtp_host is empty,
    logging the full reset URL to stdout for developer convenience.
    """

    async def send_password_reset(
        self,
        to_email: str,
        reset_token: str,
    ) -> None:
        """Send a password reset email (or log to console).

        Args:
            to_email: Recipient email address.
            reset_token: Raw reset token to embed in the reset URL.
        """
        settings = get_settings()
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

        if settings.smtp_host:
            await self._send_smtp(to_email, reset_url, settings)
        else:
            logger.info(
                "password_reset_link",
                email=to_email,
                reset_url=reset_url,
            )

    async def _send_smtp(
        self,
        to_email: str,
        reset_url: str,
        settings: object,
    ) -> None:
        """Send email via aiosmtplib.

        Args:
            to_email: Recipient email address.
            reset_url: Full URL with embedded token.
            settings: AppSettings instance.
        """
        import aiosmtplib

        s = settings  # type: ignore[attr-defined]
        msg = EmailMessage()
        msg["From"] = f"{s.email_from_name} <{s.email_from_address}>"
        msg["To"] = to_email
        msg["Subject"] = "DuLichViet — Đặt lại mật khẩu"
        msg.set_content(
            f"Xin chào,\n\n"
            f"Bạn đã yêu cầu đặt lại mật khẩu.\n\n"
            f"Nhấn vào liên kết sau để đặt lại:\n{reset_url}\n\n"
            f"Liên kết có hiệu lực {s.password_reset_token_expire_hours} giờ.\n\n"
            f"Nếu bạn không yêu cầu, hãy bỏ qua email này."
        )

        await aiosmtplib.send(
            msg,
            hostname=s.smtp_host,
            port=s.smtp_port,
            username=s.smtp_username,
            password=s.smtp_password.get_secret_value(),
            start_tls=True,
        )
        logger.info("password_reset_email_sent", email=to_email)
