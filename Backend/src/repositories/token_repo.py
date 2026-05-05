"""Backward-compatibility shim — RefreshTokenRepository moved to auth.repository."""

from src.auth.repository import RefreshTokenRepository

__all__ = ["RefreshTokenRepository"]
