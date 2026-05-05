"""Base class for domain services — structured logging only."""

from src.core.logger import get_logger


class BaseService:
    """Base class for domain services.

    Provides:
      - self.logger: A structlog BoundLogger bound to the subclass name.

    All domain services inherit from BaseService for consistent structured logging.
    Do not add domain-specific logic here — only truly shared, domain-agnostic helpers.
    """

    def __init__(self) -> None:
        self.logger = get_logger(self.__class__.__name__)
