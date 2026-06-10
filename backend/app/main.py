from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.exceptions import setup_exception_handlers


def create_app() -> FastAPI:
    app = FastAPI(
        title="Barbershop API",
        version="0.1.0",
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    setup_exception_handlers(app)

    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from app.core.limiter import limiter

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    from app.domains.auth.router import router as auth_router
    app.include_router(auth_router, prefix="/api/v1")

    from app.domains.stammdaten.router import router as stammdaten_router
    app.include_router(stammdaten_router, prefix="/api/v1")

    from app.domains.booking.router import router as booking_router
    app.include_router(booking_router, prefix="/api/v1")

    from app.domains.booking.admin_router import router as admin_booking_router
    app.include_router(admin_booking_router, prefix="/api/v1")

    from app.domains.stammdaten.public_router import router as public_router
    app.include_router(public_router, prefix="/api/v1/public")

    from app.domains.booking.public_router import router as public_booking_router
    app.include_router(public_booking_router, prefix="/api/v1/public")

    return app


app = create_app()
