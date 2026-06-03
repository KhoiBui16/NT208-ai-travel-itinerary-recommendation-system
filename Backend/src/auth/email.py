"""Async email service with aiosmtplib + console fallback."""

from email.message import EmailMessage

from src.core.config import get_settings
from src.core.logger import get_logger

logger = get_logger(__name__)


class EmailService:
    """Send password reset emails via SMTP or console fallback."""

    async def send_password_reset(
        self,
        to_email: str,
        reset_token: str,
    ) -> None:
        """Send a password reset email (or log to console).
        
        Email Sending Flow:
        
        1. Construct reset URL
           - Base URL: settings.frontend_url (e.g., https://dulicviet.com)
           - Query param: token=<raw_reset_token>
           - URL: https://dulicviet.com/reset-password?token=xyz123
        
        2. Check SMTP configuration
           - Nếu settings.smtp_host có:
             * Gửi email thời đời thực qua aiosmtplib
           - Else:
             * Log URL vào console (development fallback)
             * Useful khi testing, không setup mail server
        
        3. (If SMTP) Gửi email qua aiosmtplib
           - async SMTP client (khong block event loop)
           - Host, port, credentials ở config
        
        Use Case (Forgot Password):
          - User quên mật khẩu -> gửi email reset link
          - Email có tính duy nhất trong số giờ
          - Link: frontend reset page với token
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
        
        SMTP Email Sending:
        
        1. Create EmailMessage
           - Python standard library: email.message.EmailMessage
           - From: noreply <noreply@dulicviet.com>
           - To: user email
           - Subject: "DuLichViet — Đặt lại mật khẩu"
        
        2. Email body (Tiếng Việt)
           - Greeting: Xin chào
           - Call to action: Yêu cầu đặt lại mật khẩu
           - Reset link: URL cả chú thích kập thời hạn
           - Disclaimer: Nếu không yêu cầu
        
        3. Send via aiosmtplib
           - Async SMTP client (non-blocking)
           - Config:
             * hostname: SMTP server (e.g., smtp.gmail.com)
             * port: 587 (TLS)
             * username: sender email
             * password: app password (secret)
             * start_tls: true (encrypt)
           - Timeout: default 30s
        
        4. Log success
        
        Error Handling:
          - Nếu SMTP fail: Được bỏ qua (forgot_password returns 200 anyway)
          - If error: exception propagates (caller should handle)
        
        Config (environment):
          - SMTP_HOST
          - SMTP_PORT
          - SMTP_USERNAME
          - SMTP_PASSWORD (secret)
          - EMAIL_FROM_NAME, EMAIL_FROM_ADDRESS
          - PASSWORD_RESET_TOKEN_EXPIRE_HOURS
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
