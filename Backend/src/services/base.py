"""Backward-compatibility shim — BaseService moved to shared.service."""

from src.shared.service import BaseService

__all__ = ["BaseService"]
