"""Prompt builder for C.1 itinerary generation."""

import json
from datetime import timedelta
from typing import Any

from src.itineraries.schemas import GenerateItineraryRequest

SYSTEM_PROMPT = """You are DuLichViet's itinerary planner.
Return ONLY valid JSON that matches the requested schema.
Prefer places from the provided candidatePlaces list.
If you include a place that is not in candidatePlaces, set placeId to null.
Keep activities realistic for Vietnam travel, with non-overlapping times.
Use candidatePlaces.avgCost and candidateHotels.pricePerNight whenever possible.
For food and attraction, prefer adultPrice / childPrice for per-person costs.
If you only know one flat group estimate, put it in customCost instead of
leaving all cost fields empty.
If transportation is bus, provide busTicketPrice per person.
If transportation is taxi, provide taxiCost as a flat ride estimate.
Do not leave every cost field null/0 for a paid activity.
Ensure totalCost matches the sum of activity, transportation, and accommodation costs.
Do not include markdown or explanations."""


def build_itinerary_prompt(
    *,
    request: GenerateItineraryRequest,
    destination_name: str,
    candidate_places: list[dict[str, Any]],
    candidate_hotels: list[dict[str, Any]],
    min_activities_per_day: int,
    max_activities_per_day: int,
    validation_feedback: list[str] | None = None,
) -> str:
    """Build a compact JSON-first prompt for Gemini."""
    trip_days = [
        {
            "dayNumber": idx + 1,
            "date": (request.start_date + timedelta(days=idx)).isoformat(),
        }
        for idx in range((request.end_date - request.start_date).days + 1)
    ]
    payload = {
        "system": SYSTEM_PROMPT,
        "task": "Generate a travel itinerary from the supplied recommendation context.",
        "constraints": {
            "destination": destination_name,
            "budget": request.budget,
            "adults": request.adults,
            "children": request.children,
            "interests": request.interests,
            "days": trip_days,
            "rules": [
                "Return exactly one day object for each requested date.",
                (
                    "Each day must contain "
                    f"{min_activities_per_day} to {max_activities_per_day} activities."
                ),
                "Activity type must be one of food, attraction, nature, entertainment, shopping.",
                "Use camelCase JSON keys.",
                "totalCost must be <= budget * 1.2.",
            ],
        },
        "candidatePlaces": candidate_places,
        "candidateHotels": candidate_hotels,
        "responseSchema": {
            "tripName": "string",
            "totalCost": "integer",
            "days": [
                {
                    "dayNumber": "integer",
                    "label": "string",
                    "activities": [
                        {
                            "time": "HH:MM",
                            "endTime": "HH:MM or null",
                            "name": "string",
                            "type": "food|attraction|nature|entertainment|shopping",
                            "location": "string",
                            "description": "string",
                            "placeId": "integer or null",
                            "adultPrice": "integer or null",
                            "childPrice": "integer or null",
                            "customCost": "integer or null",
                            "transportation": "walk|bike|bus|taxi or null",
                            "busTicketPrice": "integer or null",
                            "taxiCost": "integer or null",
                        }
                    ],
                }
            ],
            "accommodations": [
                {
                    "name": "string",
                    "hotelId": "integer or null",
                    "checkIn": "YYYY-MM-DD",
                    "checkOut": "YYYY-MM-DD",
                    "pricePerNight": "integer",
                    "totalPrice": "integer",
                    "bookingType": "nightly|daily|hourly or null",
                    "duration": "integer or null",
                    "dayIds": "list of day numbers",
                }
            ],
        },
    }
    if validation_feedback:
        payload["previousValidationErrors"] = validation_feedback
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
