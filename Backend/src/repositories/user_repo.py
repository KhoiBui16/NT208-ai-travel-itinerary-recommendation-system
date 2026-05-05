"""Backward-compatibility shim — UserRepository moved to auth.repository."""

from src.auth.repository import UserRepository

__all__ = ["UserRepository"]
