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

# --------------------------------------------------
# CORS
# --------------------------------------------------

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

# --------------------------------------------------
# API Routes
# --------------------------------------------------

app.include_router(upload_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(vendor_data_router, prefix="/api")
app.include_router(orders_router, prefix="/api")

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

print("=" * 80)
print("BASE_DIR:", BASE_DIR)
print("PROJECT_ROOT:", PROJECT_ROOT)
print("CURRENT WORKING DIRECTORY:", Path.cwd())

possible_frontend_dirs = [
    PROJECT_ROOT / "frontend_part" / "dist",
    Path.cwd() / "frontend_part" / "dist",
    Path("/app/frontend_part/dist"),
    Path("./frontend_part/dist").resolve(),
]

FRONTEND_DIR = None

for path in possible_frontend_dirs:
    print(f"Checking frontend path: {path}")
    print(f"Exists: {path.exists()}")

    if path.exists():
        FRONTEND_DIR = path
        print(f"Using frontend: {path}")
        break

if PROJECT_ROOT.exists():
    print("\nProject Root Contents:")
    for item in PROJECT_ROOT.iterdir():
        print(" -", item.name)

if FRONTEND_DIR:
    print("\nFrontend Build Contents:")
    for item in FRONTEND_DIR.iterdir():
        print(" -", item.name)
else:
    print("\nFrontend build NOT FOUND.")

print("=" * 80)

# --------------------------------------------------
# Catalog Images
# --------------------------------------------------

catalog_images = BASE_DIR / "catolog" / "images"

if catalog_images.exists():
    app.mount(
        "/catalog-images",
        StaticFiles(directory=str(catalog_images)),
        name="catalog-images",
    )

# --------------------------------------------------
# Serve React Frontend
# --------------------------------------------------

if FRONTEND_DIR:

    assets_dir = FRONTEND_DIR / "assets"

    if assets_dir.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="assets",
        )

    @app.get("/", include_in_schema=False)
    async def root():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):

        # Do not intercept API requests
        if (
            full_path.startswith("api")
            or full_path.startswith("catalog-images")
            or full_path.startswith("docs")
            or full_path.startswith("openapi.json")
            or full_path.startswith("redoc")
            or full_path.startswith("health")
        ):
            raise HTTPException(status_code=404)

        requested_file = FRONTEND_DIR / full_path

        if requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(FRONTEND_DIR / "index.html")

# --------------------------------------------------
# Startup
# --------------------------------------------------

@app.on_event("startup")
def startup_event():

    storage_dir = BASE_DIR / "storage"

    for directory in [
        storage_dir / "inputs" / "person",
        storage_dir / "inputs" / "outfit",
        storage_dir / "output",
        storage_dir / "metadata",
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    print("Backend started successfully.")

# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --------------------------------------------------
# Result Image
# --------------------------------------------------

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