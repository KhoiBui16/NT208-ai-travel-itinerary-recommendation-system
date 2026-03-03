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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created / verified")

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
    settings.FRONTEND_URL,  # Production: Vercel URL, Dev: http://localhost:5173
    "http://localhost:5173",
    "http://localhost:5174",  # Vite dev fallback port
    "http://localhost:3000",  # Fallback
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
# Lọc bỏ giá trị rỗng và trùng lặp
allowed_origins = list(set(o for o in allowed_origins if o))

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
    """Health check cho monitoring."""
    return {"status": "healthy"}
