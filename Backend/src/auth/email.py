"""Async email service with SMTP delivery and safe local fallback."""

from email.message import EmailMessage
from typing import Literal

from src.core.config import get_settings
from src.core.logger import get_logger

logger = get_logger(__name__)

PasswordResetDeliveryMode = Literal["smtp", "log_only", "disabled"]


class EmailService:
    """Send password reset emails via SMTP or a safe local fallback."""

    def get_password_reset_delivery_mode(self) -> PasswordResetDeliveryMode:
        """Return how this environment handles password-reset delivery."""
        settings = get_settings()
        if settings.smtp_host:
            return "smtp"
        if settings.environment == "development":
            return "log_only"
        return "disabled"

    async def send_password_reset(
        self,
        to_email: str,
        reset_token: str,
    ) -> PasswordResetDeliveryMode:
        """Send a password reset email according to the active delivery mode."""
        settings = get_settings()
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
        delivery_mode = self.get_password_reset_delivery_mode()

        if delivery_mode == "smtp":
            await self._send_smtp(to_email, reset_url, settings)
        elif delivery_mode == "log_only":
            logger.info(
                "password_reset_link",
                email=to_email,
                reset_url=reset_url,
            )
        else:
            logger.warning(
                "password_reset_email_delivery_disabled",
                email=to_email,
                environment=settings.environment,
            )

        return delivery_mode

    async def _send_smtp(
        self,
        to_email: str,
        reset_url: str,
        settings: object,
    ) -> None:
        """Send email via aiosmtplib."""
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
