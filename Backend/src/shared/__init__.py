"""Shared app-level helpers — no domain imports."""

from src.shared.cache import CacheClient
from src.shared.pagination import calculate_pagination
from src.shared.service import BaseService

__all__ = ["BaseService", "CacheClient", "calculate_pagination"]
