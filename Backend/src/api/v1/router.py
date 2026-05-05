"""API v1 router aggregator."""

from fastapi import APIRouter

from src.api.v1.health import router as health_router
from src.auth.router import auth_router, user_router
from src.itineraries.router import router as itineraries_router
from src.itineraries.router import shared_router
from src.places.router import router as places_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(user_router)
api_v1_router.include_router(places_router)
api_v1_router.include_router(itineraries_router)
api_v1_router.include_router(shared_router)
