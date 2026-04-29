"""API v1 router aggregator."""

from fastapi import APIRouter

from src.api.v1.auth import router as auth_router
from src.api.v1.health import router as health_router
from src.api.v1.itineraries import router as itineraries_router
from src.api.v1.shared import shared_router
from src.api.v1.users import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(itineraries_router)
api_v1_router.include_router(shared_router)
