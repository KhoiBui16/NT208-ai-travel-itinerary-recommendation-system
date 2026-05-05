"""Backward-compatibility shim — UserService moved to auth.profile_service."""

from src.auth.profile_service import UserService

__all__ = ["UserService"]
