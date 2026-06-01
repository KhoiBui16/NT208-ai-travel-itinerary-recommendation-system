"""DB-only place suggestions for activity alternatives (Phase C.2).

Provides contextual alternative suggestions based on:
  - Same destination as the current trip
  - Same category as the target activity
  - Excludes places already used in the trip

No LLM involvement — purely database-driven recommendations
ranked by rating and review count.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ForbiddenException, NotFoundException
from src.itineraries.repository import TripRepository
from src.places.models import Place
from src.places.repository import PlaceRepository
from src.places.schemas import PlaceResponse, SuggestionResponse
from src.shared.service import BaseService


class SuggestionService(BaseService):
    """Suggest alternative places from DB — no LLM.

    Uses both TripRepository (for activity/trip context) and
    PlaceRepository (for finding alternative places).
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__()
        self.session = session
        self.trip_repo = TripRepository(session)  # For loading activity and trip context
        self.place_repo = PlaceRepository(session)  # For finding alternative places

    async def suggest_alternatives(
        self,
        activity_id: int,
        user_id: int,
        limit: int = 5,
    ) -> SuggestionResponse:
        """Suggest alternative places for a specific activity.

        Algorithm:
        1. Load the activity with its parent day and trip
        2. Verify the requester owns the trip
        3. Resolve the trip's destination from the places DB
        4. Find top-rated places in the same category, excluding
           places already used in the trip
        5. Return up to `limit` alternative suggestions

        Returns empty suggestions if the destination can't be resolved
        (graceful degradation for destinations without ETL data).
        """
        # Step 1: Load activity with its full trip context
        activity = await self.trip_repo.get_activity_with_trip(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")

        # Step 2: Verify ownership
        trip = activity.trip_day.trip
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        # Step 3: Resolve destination (try name match, then slug match)
        destination = await self.place_repo.get_destination_by_name(trip.destination)
        if not destination:
            destination = await self.place_repo.get_destination_by_slug(trip.destination)
        if not destination:
            # Destination not in DB — return empty suggestions gracefully
            return SuggestionResponse(
                activity_id=activity_id,
                current_name=activity.name,
                suggestions=[],
            )

        # Step 4: Build exclusion list (places already in this trip)
        exclude_ids = await self.trip_repo.get_place_ids_in_trip(trip.id)
        # Also exclude the current activity's place if it has one
        if activity.place_id is not None and activity.place_id not in exclude_ids:
            exclude_ids = [*exclude_ids, activity.place_id]

        # Step 5: Find alternative places in the same category
        places = await self.place_repo.find_alternatives(
            destination_id=destination.id,
            category=activity.type,
            exclude_ids=exclude_ids,
            limit=limit,
        )

        return SuggestionResponse(
            activity_id=activity_id,
            current_name=activity.name,
            suggestions=[self._to_place_response(p) for p in places],
        )

    # --- Private helpers ---

    @staticmethod
    def _to_place_response(place: Place) -> PlaceResponse:
        """Convert a Place ORM to PlaceResponse for suggestion display.

        Includes review_count in both `review_count` and `reviews` fields
        for backward compatibility with different FE components.
        """
        city = place.destination.name if place.destination else ""
        review_count = place.review_count or 0
        return PlaceResponse(
            id=place.id,
            name=place.name,
            type=place.category,
            image=place.image,
            location=place.location,
            rating=place.rating,
            review_count=review_count,
            reviews=review_count,  # Alias for backward compatibility
            city=city,
            description=place.description,
        )
