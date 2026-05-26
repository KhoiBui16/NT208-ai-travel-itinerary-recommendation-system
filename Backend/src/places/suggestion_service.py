"""DB-only place suggestions for activity alternatives (Phase C.2)."""

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ForbiddenException, NotFoundException
from src.itineraries.repository import TripRepository
from src.places.models import Place
from src.places.repository import PlaceRepository
from src.places.schemas import PlaceResponse, SuggestionResponse
from src.shared.service import BaseService


class SuggestionService(BaseService):
    """Suggest alternative places from DB — no LLM."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__()
        self.session = session
        self.trip_repo = TripRepository(session)
        self.place_repo = PlaceRepository(session)

    async def suggest_alternatives(
        self,
        activity_id: int,
        user_id: int,
        limit: int = 5,
    ) -> SuggestionResponse:
        activity = await self.trip_repo.get_activity_with_trip(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")

        trip = activity.trip_day.trip
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        destination = await self.place_repo.get_destination_by_name(trip.destination)
        if not destination:
            destination = await self.place_repo.get_destination_by_slug(trip.destination)
        if not destination:
            return SuggestionResponse(
                activity_id=activity_id,
                current_name=activity.name,
                suggestions=[],
            )

        exclude_ids = await self.trip_repo.get_place_ids_in_trip(trip.id)
        if activity.place_id is not None and activity.place_id not in exclude_ids:
            exclude_ids = [*exclude_ids, activity.place_id]

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

    @staticmethod
    def _to_place_response(place: Place) -> PlaceResponse:
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
            reviews=review_count,
            city=city,
            description=place.description,
        )
