"""Shared pytest setup for MVP2 backend tests."""

from pathlib import Path
from sys import path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
path.insert(0, str(BACKEND_ROOT))
