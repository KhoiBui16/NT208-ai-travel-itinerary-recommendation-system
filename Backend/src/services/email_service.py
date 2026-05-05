"""Backward-compatibility shim — EmailService moved to auth.email."""

from src.auth.email import EmailService

__all__ = ["EmailService"]
