"""Base service helpers."""

from src.core.logger import get_logger


class BaseService:
    """Base class for domain services."""

    def __init__(self) -> None:
        self.logger = get_logger(self.__class__.__name__)
