"""
============================================
app/config.py — Cấu hình toàn cục (Settings)
============================================
Dùng pydantic-settings để đọc biến môi trường từ file .env
Mỗi biến có giá trị mặc định để dev dễ setup.

Cách dùng:
    from app.config import settings
    print(settings.DATABASE_URL)
============================================
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Cấu hình ứng dụng, đọc từ file .env hoặc biến môi trường hệ thống.
    Nếu không tìm thấy biến, dùng giá trị mặc định.
    """

    # --- Database ---
    # PostgreSQL connection string (async driver: asyncpg)
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet"
    )

    # --- JWT Authentication ---
    # Secret key để ký JWT token — BẮT BUỘC thay đổi trong production!
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production"
    # Thuật toán ký JWT
    JWT_ALGORITHM: str = "HS256"
    # Token hết hạn sau bao nhiêu phút (mặc định 24 giờ = 1440 phút)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # --- Google Gemini AI ---
    # API key để gọi Gemini API tạo lịch trình du lịch
    GEMINI_API_KEY: str = ""

    # --- CORS ---
    # URL Frontend (cho phép gọi API cross-origin)
    FRONTEND_URL: str = "http://localhost:5173"

    # --- App ---
    # Bật debug mode (hiện thêm log, error detail)
    DEBUG: bool = True
    # Tên ứng dụng
    APP_NAME: str = "Du Lịch Việt API"

    # --- Pydantic Settings ---
    # Đọc biến từ file .env, bỏ qua nếu .env không tồn tại
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Bỏ qua biến thừa trong .env
    )


# --- Singleton instance ---
# Tạo 1 lần duy nhất, import ở bất kỳ file nào đều dùng chung
settings = Settings()
