from fastapi import APIRouter

from app.api.routes import (
    behavior_reports,
    dashboard,
    items,
    login,
    private,
    results,
    tasks,
    users,
    utils,
    videos,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(dashboard.router)
api_router.include_router(behavior_reports.router)
api_router.include_router(videos.router)
api_router.include_router(tasks.router)
api_router.include_router(results.router)

if settings.FASTAPI_ENV == "development":
    api_router.include_router(private.router)
