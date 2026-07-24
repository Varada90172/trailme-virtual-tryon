from fastapi import APIRouter, File, Form, HTTPException, UploadFile

try:
    from ..processing.preprocess import preprocess_image
    from ..session.store import store
    from ..utils.logging_config import logger
    from ..utils.validation import validate_upload
    from ..utils.db import ensure_tryon_session
    from .dependencies import CurrentUser
except ImportError:  # pragma: no cover
    from processing.preprocess import preprocess_image
    from session.store import store
    from utils.logging_config import logger
    from utils.validation import validate_upload
    from utils.db import ensure_tryon_session
    from routes.dependencies import CurrentUser

router = APIRouter()


@router.post("/upload")
async def upload_image(user: CurrentUser, session_id: str = Form(...), slot: str = Form(...), file: UploadFile = File(...)):
    contents = await file.read()
    validate_upload(contents, file.content_type or "")
    validate_slot(slot)
    try:
        ensure_tryon_session(session_id, user["id"])
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=403, detail="Invalid or inaccessible session") from exc

    processed_bytes, content_type = preprocess_image(contents, file.content_type or "image/jpeg")
    store.save_image(session_id, slot, processed_bytes, content_type)
    logger.info("Stored %s image for session %s", slot, session_id)
    return {"status": "ok", "session_id": session_id, "slot": slot}


def validate_slot(slot: str) -> None:
    if slot not in {"person", "outfit"}:
        raise HTTPException(status_code=400, detail="slot must be person or outfit")
