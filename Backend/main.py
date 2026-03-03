"""
============================================
main.py — Entry point cho FastAPI Backend
============================================
File này khởi tạo FastAPI app, đăng ký routers,
setup CORS middleware, và tạo bảng DB khi startup.

Chạy: uvicorn main:app --reload --port 8000
Swagger docs: http://localhost:8000/docs
============================================
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, users, trips, places

# --- Import tất cả models để SQLAlchemy biết tạo bảng ---
from app.models import user, trip, place, trip_place  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event: chạy khi app khởi động và tắt.
    - Startup: tạo tất cả bảng nếu chưa tồn tại (dev mode)
    - Shutdown: đóng kết nối DB
    """
    # --- Startup: tạo bảng DB (chỉ dùng cho dev, production dùng alembic) ---
    print(f"⚡ Starting Du Lịch Việt API...")
    print(
        f"  DATABASE_URL: {settings.DATABASE_URL[:30]}..."
        if len(settings.DATABASE_URL) > 30
        else f"  DATABASE_URL: {settings.DATABASE_URL}"
    )
    print(f"  FRONTEND_URL: {settings.FRONTEND_URL}")
    print(f"  DEBUG: {settings.DEBUG}")
    print(
        f"  GEMINI_API_KEY: {'***' + settings.GEMINI_API_KEY[-4:] if settings.GEMINI_API_KEY else 'NOT SET'}"
    )

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created / verified")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("  ↳ App will start but DB operations will fail")
        print("  ↳ Check DATABASE_URL environment variable")

    yield  # App đang chạy

    # --- Shutdown: đóng kết nối ---
    await engine.dispose()
    print("🔌 Database connection closed")


# --- Khởi tạo FastAPI app ---
app = FastAPI(
    title="Du Lịch Việt API",
    description="Backend API cho hệ thống đề xuất du lịch thông minh bằng AI (MVP #1)",
    version="1.0.0",
    lifespan=lifespan,
)


# --- CORS Middleware ---
# Cho phép Frontend gọi API Backend (dev + production)
allowed_origins = [
    settings.FRONTEND_URL,  # Production: Vercel URL (từ env var FRONTEND_URL)
    # Vercel production URL (hardcode để đảm bảo luôn hoạt động)
    "https://ai-travel-itinerary-recommendation.vercel.app",
    # Local development
    "http://localhost:5173",
    "http://localhost:5174",  # Vite dev fallback port
    "http://localhost:3000",  # Fallback
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
# Lọc bỏ giá trị rỗng và trùng lặp
allowed_origins = list(set(o for o in allowed_origins if o))
print(f"🌐 CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Cho phép gửi cookies/auth headers
    allow_methods=["*"],  # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Authorization, Content-Type, etc.
)


# --- Đăng ký Routers (API endpoints) ---
# Mỗi router xử lý 1 nhóm chức năng, prefix = URL path chung
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(trips.router, prefix="/api/v1/itineraries", tags=["Itineraries"])
app.include_router(places.router, prefix="/api/v1/destinations", tags=["Destinations"])


# --- Health check endpoint ---
@app.get("/", tags=["Health"])
async def root():
    """Kiểm tra server có đang chạy không."""
    return {
        "status": "ok",
        "message": "Du Lịch Việt API is running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check cho monitoring (bao gồm DB connectivity)."""
    health = {"status": "healthy", "api": "ok"}
    try:
        from app.database import AsyncSessionLocal
        from sqlalchemy import text

        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        health["database"] = "connected"
    except Exception as e:
        health["status"] = "degraded"
        health["database"] = f"error: {str(e)[:100]}"
    return health
