from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

try:
    from .dependencies import VendorUser
    from ..utils.db import delete_vendor_record, list_vendor_records, save_vendor_record
    from ..utils.validation import validate_upload
except ImportError:  # pragma: no cover
    from routes.dependencies import VendorUser
    from utils.db import delete_vendor_record, list_vendor_records, save_vendor_record
    from utils.validation import validate_upload

router = APIRouter()


class VendorRecord(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


@router.get("/vendor/catalog")
async def get_vendor_catalog(user: VendorUser):
    return list_vendor_records("vendor_products", user["id"])


@router.put("/vendor/catalog/{product_id}")
async def save_vendor_catalog(product_id: str, record: VendorRecord, user: VendorUser):
    if not product_id.startswith("SAREE-") or len(product_id) > 80:
        raise HTTPException(status_code=400, detail="Invalid product id")
    try:
        return save_vendor_record("vendor_products", product_id, user["id"], record.data)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail="Product does not belong to the signed-in vendor") from exc


@router.delete("/vendor/catalog/{product_id}", status_code=204)
async def delete_vendor_catalog(product_id: str, user: VendorUser):
    if not delete_vendor_record("vendor_products", product_id, user["id"]):
        raise HTTPException(status_code=404, detail="Product not found")


@router.post("/vendor/catalog/image")
async def upload_vendor_catalog_image(user: VendorUser, file: UploadFile = File(...)):
    content = await file.read()
    validate_upload(content, file.content_type or "")
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type or ""]
    images_dir = Path(__file__).resolve().parents[1] / "catolog" / "images" / "vendor"
    images_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{user['id']}-{uuid4().hex}{ext}"
    (images_dir / filename).write_bytes(content)
    return {"url": f"/catalog-images/vendor/{filename}"}


@router.get("/vendor/customers")
async def get_vendor_customers(user: VendorUser, search: str = Query(default="", max_length=120)):
    """Search saved customer profiles across contact details and trial history."""
    customers = list_vendor_records("vendor_customers", user["id"])
    query = search.strip().lower()
    if not query:
        return customers
    return [
        customer for customer in customers
        if query in " ".join(str(value) for value in customer.values()).lower()
    ]


@router.put("/vendor/customers/{customer_id}")
async def save_vendor_customer(customer_id: str, record: VendorRecord, user: VendorUser):
    if not customer_id.startswith("CUST-") or len(customer_id) > 80:
        raise HTTPException(status_code=400, detail="Invalid customer id")
    try:
        return save_vendor_record("vendor_customers", customer_id, user["id"], record.data)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail="Customer does not belong to the signed-in vendor") from exc


@router.get("/vendor/occasions")
async def get_vendor_occasions(user: VendorUser):
    return list_vendor_records("vendor_occasions", user["id"])


@router.put("/vendor/occasions/{occasion_id}")
async def save_vendor_occasion(occasion_id: str, record: VendorRecord, user: VendorUser):
    if not occasion_id.startswith("OCC-") or len(occasion_id) > 80:
        raise HTTPException(status_code=400, detail="Invalid occasion id")
    return save_vendor_record("vendor_occasions", occasion_id, user["id"], record.data)


@router.delete("/vendor/occasions/{occasion_id}", status_code=204)
async def delete_vendor_occasion(occasion_id: str, user: VendorUser):
    if not delete_vendor_record("vendor_occasions", occasion_id, user["id"]):
        raise HTTPException(status_code=404, detail="Occasion not found")
