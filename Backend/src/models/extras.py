"""Auxiliary trip, share, claim, and chat ORM models."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if TYPE_CHECKING:
    from src.models.trip import Activity, Trip, TripDay
    from src.models.user import User


class ExtraExpense(Base):
    """Extra cost at either day level or activity level."""

    __tablename__ = "extra_expenses"
    __table_args__ = (
        CheckConstraint(
            "(activity_id IS NOT NULL AND trip_day_id IS NULL) OR "
            "(activity_id IS NULL AND trip_day_id IS NOT NULL)",
            name="ck_extra_expenses_single_parent",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    trip_day_id: Mapped[int | None] = mapped_column(
        ForeignKey("trip_days.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)

    activity: Mapped["Activity | None"] = relationship(back_populates="extra_expenses")
    trip_day: Mapped["TripDay | None"] = relationship(back_populates="extra_expenses")


class Accommodation(Base):
    """Trip accommodation record."""

    __tablename__ = "accommodations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hotel_id: Mapped[int | None] = mapped_column(ForeignKey("hotels.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    check_in: Mapped[str] = mapped_column(String(20), nullable=False)
    check_out: Mapped[str] = mapped_column(String(20), nullable=False)
    price_per_night: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    booking_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_ids: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)

    trip: Mapped["Trip"] = relationship(back_populates="accommodations")


class ShareLink(Base):
    """Opaque share token for public read-only trip access."""

    __tablename__ = "share_links"
    __table_args__ = (UniqueConstraint("trip_id", name="uq_share_links_trip_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    permission: Mapped[str] = mapped_column(String(20), default="view", nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="share_link")


class TripRating(Base):
    """User feedback for a generated trip."""

    __tablename__ = "trip_ratings"
    __table_args__ = (
        UniqueConstraint("trip_id", name="uq_trip_ratings_trip_id"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_trip_ratings_rating_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="rating")


class GuestClaimToken(Base):
    """One-time claim token for guest-created trips."""

    __tablename__ = "guest_claim_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="claim_tokens")


class ChatSession(Base):
    """Clean chat session projection for API history and LangGraph thread mapping."""

    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    thread_id: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="chat_sessions")
    user: Mapped["User | None"] = relationship(back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    """Public chat history message projection."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_operations: Mapped[list[dict[str, object]]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    requires_confirmation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session: Mapped[ChatSession] = relationship(back_populates="messages")
