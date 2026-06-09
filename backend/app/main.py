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

    from app.domains.stammdaten.router import router as stammdaten_router
    app.include_router(stammdaten_router, prefix="/api/v1")

    from app.domains.booking.router import router as booking_router
    app.include_router(booking_router, prefix="/api/v1")

    return app


app = create_app()
