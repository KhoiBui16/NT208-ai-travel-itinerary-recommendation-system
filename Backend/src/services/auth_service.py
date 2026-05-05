"""Backward-compatibility shim — AuthService moved to auth.service."""

from src.auth.service import AuthService

__all__ = ["AuthService"]
