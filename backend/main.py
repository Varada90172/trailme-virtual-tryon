import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routes.generate import router as generate_router
from .routes.upload import router as upload_router
from .routes.auth import router as auth_router
from .routes.catalog import router as catalog_router
from .routes.dashboard import router as dashboard_router
from .routes.vendor_data import router as vendor_data_router
from .routes.orders import router as orders_router
from .routes.dependencies import CurrentUser
from .utils.db import get_tryon_session

app = FastAPI(title="Virtual Try-On API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(vendor_data_router, prefix="/api")
app.include_router(orders_router, prefix="/api")

# Static files
BASE_DIR = Path(__file__).resolve().parent

app.mount(
    "/catalog-images",
    StaticFiles(directory=str(BASE_DIR / "catolog" / "images")),
    name="catalog-images",
)


@app.on_event("startup")
def startup_event():
    """
    Application startup.
    Databricks tables are already created,
    so no SQLite initialization is required.
    """

    storage_dir = BASE_DIR / "storage"

    person_dir = storage_dir / "inputs" / "person"
    outfit_dir = storage_dir / "inputs" / "outfit"
    output_dir = storage_dir / "output"
    metadata_dir = storage_dir / "metadata"

    for directory in (
        person_dir,
        outfit_dir,
        output_dir,
        metadata_dir,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    print("✅ Backend started successfully.")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/results/{session_id}")
def get_result(session_id: str, user: CurrentUser):
    try:
        session = get_tryon_session(session_id, user["id"])
    except ValueError:
        session = None

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Result not found",
        )

    result_path = (
        BASE_DIR
        / "storage"
        / "output"
        / f"{session_id}.jpg"
    )

    if not result_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Result not found",
        )

    return FileResponse(result_path)