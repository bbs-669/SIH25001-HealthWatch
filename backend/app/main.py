from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import villages, reports, resources, ml

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Community Health Monitoring & Early Warning System",
    description=(
        "Backend API for SIH25001: Community health surveillance, water quality tracking, "
        "and early outbreak warnings for rural Northeast India."
    ),
    version="1.0.0"
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers
app.include_router(villages.router)
app.include_router(reports.router)
app.include_router(resources.router)
app.include_router(ml.router)



@app.get("/health", tags=["Health Check"])
def health_check():
    """Health check endpoint to verify backend operational status."""
    return {
        "status": "ok",
        "service": "SIH25001-HealthWatch",
        "phase": 1,
        "region": "Northeast India (Assam & Meghalaya)"
    }
