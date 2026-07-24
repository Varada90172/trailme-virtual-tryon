import json
from pathlib import Path
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..session.store import store
from ..utils.logging_config import logger
from ..utils.db import get_vendor_record, update_tryon_session
from .dependencies import CurrentUser

router = APIRouter()

CATALOG_DIR = Path(__file__).resolve().parents[1] / "catolog"
CATALOG_JSON_PATH = CATALOG_DIR / "catalog.json"
IMAGES_DIR = CATALOG_DIR / "images"

class SelectOutfitRequest(BaseModel):
    session_id: str
    product_id: str


@router.get("/catalog")
async def get_catalog():
    if not CATALOG_JSON_PATH.exists():
        raise HTTPException(status_code=404, detail="Catalog metadata not found")
    try:
        with open(CATALOG_JSON_PATH, "r", encoding="utf-8") as f:
            catalog_data = json.load(f)
        return catalog_data
    except Exception as e:
        logger.exception("Failed to read catalog JSON")
        raise HTTPException(status_code=500, detail=f"Failed to read catalog: {e}")


@router.post("/session/select-outfit")
async def select_outfit(request: SelectOutfitRequest, user: CurrentUser):
    if not CATALOG_JSON_PATH.exists():
        raise HTTPException(status_code=500, detail="Catalog not configured")
        
    try:
        with open(CATALOG_JSON_PATH, "r", encoding="utf-8") as f:
            catalog_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading catalog: {e}")
        
    selected_item = None
    for item in catalog_data:
        if item["id"] == request.product_id:
            selected_item = item
            break
            
    if selected_item:
        img_path = IMAGES_DIR / selected_item["img_filename"]
    else:
        selected_item = get_vendor_record("vendor_products", request.product_id, user["id"])
        if not selected_item:
            raise HTTPException(status_code=404, detail=f"Product {request.product_id} not found in your catalog")
        image_url = selected_item.get("img", "")
        image_path = urlparse(image_url).path
        if not image_path.startswith("/catalog-images/"):
            raise HTTPException(status_code=400, detail="Vendor product image is missing or invalid")
        relative_path = image_path.removeprefix("/catalog-images/")
        img_path = (IMAGES_DIR / relative_path).resolve()
        try:
            img_path.relative_to(IMAGES_DIR.resolve())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Vendor product image is invalid") from exc
    
    if not img_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file for product {request.product_id} not found")
        
    ext = img_path.suffix.lower()
    if ext == ".png":
        mime_type = "image/png"
    elif ext in (".jpg", ".jpeg"):
        mime_type = "image/jpeg"
    elif ext == ".webp":
        mime_type = "image/webp"
    else:
        mime_type = "image/jpeg"
        
    try:
        update_tryon_session(request.session_id, user["id"], product_id=request.product_id, status="ready")
        store.save_image_from_path(request.session_id, "outfit", img_path, mime_type)
        logger.info("Associated outfit %s with session %s", request.product_id, request.session_id)
        return {"status": "ok", "session_id": request.session_id, "product_id": request.product_id}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail="Session does not belong to the signed-in user") from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid session id") from e
    except Exception as e:
        logger.exception("Failed to select outfit")
        raise HTTPException(status_code=500, detail=f"Failed to associate outfit: {e}")
