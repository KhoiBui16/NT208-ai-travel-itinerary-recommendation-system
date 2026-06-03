"""Middleware and exception handler registration.

Sets up four layers on the FastAPI app:
  1. Request ID — attach/propagate X-Request-ID for log correlation.
  2. CORS — allow FE origins from settings.cors_origins.
  3. Request logging — log method, path, status, duration for every request.
  4. Exception handlers — format AppException and HTTPException into consistent JSON.
"""

import time
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import AppSettings
from src.core.exceptions import AppException, app_exception_handler, http_exception_handler
from src.core.logger import get_logger
from src.core.middleware.request_id import RequestIDMiddleware

logger = get_logger(__name__)


def setup_middlewares(app: FastAPI, settings: AppSettings) -> None:
    """Register Request ID, CORS, request logging, and exception handlers.

    Middleware is applied in reverse registration order (last-registered = outermost).
    Registration order here means execution order is: RequestID → CORS → logging.

    Args:
        app: The FastAPI application instance.
        settings: AppSettings for CORS origins and other config.
    """
    # Layer 1: Request logging middleware (innermost — runs last)
    app.middleware("http")(request_logging_middleware)
    # Layer 2: CORS — allow FE development servers
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Layer 3: Request ID — outermost, runs before CORS so request_id is available
    # for all downstream log events including CORS preflight
    app.add_middleware(RequestIDMiddleware)
    # Layer 4: Consistent exception formatting
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)


async def request_logging_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Log request duration without logging request bodies or secrets.

    Records method, path, status code, and duration in milliseconds.
    Structured logging makes it easy to filter and aggregate in production.
    """
    started_at = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    return response
