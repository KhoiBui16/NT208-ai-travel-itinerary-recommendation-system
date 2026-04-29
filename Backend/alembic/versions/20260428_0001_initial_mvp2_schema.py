"""Initial MVP2 schema.

Revision ID: 20260428_0001
Revises:
Create Date: 2026-04-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260428_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the 16 core MVP2 tables."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("interests", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "destinations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image", sa.String(500), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("places_count", sa.Integer(), nullable=False),
        sa.Column("last_etl_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("name", name="uq_destinations_name"),
        sa.UniqueConstraint("slug", name="uq_destinations_slug"),
    )

    op.create_table(
        "places",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("destination_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(300), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("avg_cost", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False),
        sa.Column("review_count", sa.Integer(), nullable=False),
        sa.Column("image", sa.String(500), nullable=False),
        sa.Column("opening_hours", sa.String(100), nullable=True),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["destination_id"], ["destinations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_places_destination_id", "places", ["destination_id"])
    op.create_index("ix_places_name", "places", ["name"])
    op.create_index("ix_places_category", "places", ["category"])

    op.create_table(
        "hotels",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("destination_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("price_per_night", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False),
        sa.Column("review_count", sa.Integer(), nullable=False),
        sa.Column("location", sa.String(300), nullable=False),
        sa.Column("image", sa.String(500), nullable=False),
        sa.Column("booking_url", sa.String(500), nullable=True),
        sa.Column("amenities", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["destination_id"], ["destinations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_hotels_destination_id", "hotels", ["destination_id"])

    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("destination", sa.String(100), nullable=False),
        sa.Column("trip_name", sa.String(200), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("budget", sa.Integer(), nullable=False),
        sa.Column("total_cost", sa.Integer(), nullable=False),
        sa.Column("adults_count", sa.Integer(), nullable=False),
        sa.Column("children_count", sa.Integer(), nullable=False),
        sa.Column("interests", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_trips_user_id", "trips", ["user_id"])
    op.create_index("ix_trips_destination", "trips", ["destination"])
    op.create_index("ix_trips_created_at", "trips", ["created_at"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])

    op.create_table(
        "saved_places",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("place_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["place_id"], ["places.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "place_id", name="uq_saved_places_user_place"),
    )
    op.create_index("ix_saved_places_user_id", "saved_places", ["user_id"])
    op.create_index("ix_saved_places_place_id", "saved_places", ["place_id"])

    op.create_table(
        "trip_days",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("day_number", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(50), nullable=False),
        sa.Column("date", sa.String(20), nullable=False),
        sa.Column("destination_name", sa.String(100), nullable=True),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("trip_id", "day_number", name="uq_trip_days_trip_number"),
    )
    op.create_index("ix_trip_days_trip_id", "trip_days", ["trip_id"])

    op.create_table(
        "accommodations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("hotel_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("check_in", sa.String(20), nullable=False),
        sa.Column("check_out", sa.String(20), nullable=False),
        sa.Column("price_per_night", sa.Integer(), nullable=False),
        sa.Column("total_price", sa.Integer(), nullable=False),
        sa.Column("booking_url", sa.String(500), nullable=True),
        sa.Column("booking_type", sa.String(20), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("day_ids", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"]),
    )
    op.create_index("ix_accommodations_trip_id", "accommodations", ["trip_id"])

    op.create_table(
        "share_links",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("permission", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("trip_id", name="uq_share_links_trip_id"),
        sa.UniqueConstraint("token_hash", name="uq_share_links_token_hash"),
    )
    op.create_index("ix_share_links_created_by_user_id", "share_links", ["created_by_user_id"])

    op.create_table(
        "trip_ratings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_trip_ratings_rating_range"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("trip_id", name="uq_trip_ratings_trip_id"),
    )

    op.create_table(
        "guest_claim_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_guest_claim_tokens_token_hash"),
    )
    op.create_index("ix_guest_claim_tokens_trip_id", "guest_claim_tokens", ["trip_id"])

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_day_id", sa.Integer(), nullable=False),
        sa.Column("place_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("time", sa.String(10), nullable=False),
        sa.Column("end_time", sa.String(10), nullable=True),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("location", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image", sa.String(500), nullable=False),
        sa.Column("transportation", sa.String(50), nullable=True),
        sa.Column("adult_price", sa.Integer(), nullable=True),
        sa.Column("child_price", sa.Integer(), nullable=True),
        sa.Column("custom_cost", sa.Integer(), nullable=True),
        sa.Column("bus_ticket_price", sa.Integer(), nullable=True),
        sa.Column("taxi_cost", sa.Integer(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_day_id"], ["trip_days.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["place_id"], ["places.id"]),
    )
    op.create_index("ix_activities_trip_day_id", "activities", ["trip_day_id"])

    op.create_table(
        "extra_expenses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("activity_id", sa.Integer(), nullable=True),
        sa.Column("trip_day_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.CheckConstraint(
            "(activity_id IS NOT NULL AND trip_day_id IS NULL) OR "
            "(activity_id IS NULL AND trip_day_id IS NOT NULL)",
            name="ck_extra_expenses_single_parent",
        ),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trip_day_id"], ["trip_days.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_extra_expenses_activity_id", "extra_expenses", ["activity_id"])
    op.create_index("ix_extra_expenses_trip_day_id", "extra_expenses", ["trip_day_id"])

    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("thread_id", sa.String(120), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("thread_id", name="uq_chat_sessions_thread_id"),
    )
    op.create_index("ix_chat_sessions_trip_id", "chat_sessions", ["trip_id"])
    op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("proposed_operations", sa.JSON(), nullable=False),
        sa.Column("requires_confirmation", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])


def downgrade() -> None:
    """Drop the 16 core MVP2 tables in reverse dependency order."""
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_index("ix_extra_expenses_trip_day_id", table_name="extra_expenses")
    op.drop_index("ix_extra_expenses_activity_id", table_name="extra_expenses")
    op.drop_table("extra_expenses")
    op.drop_index("ix_activities_trip_day_id", table_name="activities")
    op.drop_table("activities")
    op.drop_table("guest_claim_tokens")
    op.drop_table("trip_ratings")
    op.drop_table("share_links")
    op.drop_index("ix_accommodations_trip_id", table_name="accommodations")
    op.drop_table("accommodations")
    op.drop_index("ix_trip_days_trip_id", table_name="trip_days")
    op.drop_table("trip_days")
    op.drop_index("ix_saved_places_place_id", table_name="saved_places")
    op.drop_index("ix_saved_places_user_id", table_name="saved_places")
    op.drop_table("saved_places")
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_index("ix_trips_created_at", table_name="trips")
    op.drop_index("ix_trips_destination", table_name="trips")
    op.drop_index("ix_trips_user_id", table_name="trips")
    op.drop_table("trips")
    op.drop_index("ix_hotels_destination_id", table_name="hotels")
    op.drop_table("hotels")
    op.drop_index("ix_places_category", table_name="places")
    op.drop_index("ix_places_name", table_name="places")
    op.drop_index("ix_places_destination_id", table_name="places")
    op.drop_table("places")
    op.drop_table("destinations")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
