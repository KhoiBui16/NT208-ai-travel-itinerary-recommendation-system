"""Backward-compatibility shim — User + RefreshToken moved to auth.models."""

from src.auth.models import RefreshToken, User

__all__ = ["User", "RefreshToken"]
