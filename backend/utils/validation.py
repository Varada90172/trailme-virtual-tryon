import os
from io import BytesIO
from typing import Tuple

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "5"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


def validate_upload(file_bytes: bytes, content_type: str) -> None:
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file upload")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB} MB limit")
    try:
        with Image.open(BytesIO(file_bytes)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Upload is not a valid image") from exc
