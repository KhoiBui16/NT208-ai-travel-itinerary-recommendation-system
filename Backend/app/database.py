"""
============================================
app/database.py — Kết nối Database (Async)
============================================
Setup SQLAlchemy async engine và session.
Dùng asyncpg driver cho PostgreSQL.

Cách dùng trong router:
    from app.database import get_db
    async def endpoint(db: AsyncSession = Depends(get_db)):
        ...

Giải thích:
- Engine: quản lý connection pool tới PostgreSQL
- AsyncSession: 1 phiên làm việc với DB (query, commit, rollback)
- get_db: dependency injection — mỗi request tạo 1 session riêng
============================================
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# --- Async Engine ---
# create_async_engine tạo connection pool tới PostgreSQL
# echo=True: in SQL query ra console (debug), tắt trong production
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # In SQL ra console khi DEBUG=True
    pool_size=5,  # Số connection tối đa trong pool
    max_overflow=10,  # Thêm tối đa 10 connection khi pool đầy
    pool_pre_ping=True,  # Kiểm tra connection còn sống trước khi dùng
)


# --- Session Factory ---
# async_sessionmaker tạo ra AsyncSession mỗi khi được gọi
# expire_on_commit=False: không tự động refresh object sau commit
#   (tránh lazy-load lỗi trong async context)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# --- Base class cho tất cả models ---
# Tất cả SQLAlchemy model phải kế thừa Base
class Base(DeclarativeBase):
    """
    Base declarative class.
    Mọi model (User, Trip, Place, TripPlace) kế thừa từ đây.
    SQLAlchemy dùng Base.metadata để biết cần tạo bảng nào.
    """

    pass


# --- Dependency Injection: get_db ---
async def get_db():
    """
    Tạo 1 AsyncSession cho mỗi request.
    Dùng với FastAPI Depends():
        async def endpoint(db: AsyncSession = Depends(get_db)):

    - Mở session khi request bắt đầu
    - Tự động đóng session khi request kết thúc (dù có lỗi)
    - yield cho phép FastAPI quản lý lifecycle
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
