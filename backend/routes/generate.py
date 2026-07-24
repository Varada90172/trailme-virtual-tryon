from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..processing.gemini_client import ImageGenerationError, generate_try_on
from ..session.store import store
from ..storage.result_store import save_result
from ..utils.logging_config import logger
from ..utils.db import get_tryon_session, update_tryon_session
from .dependencies import CurrentUser

router = APIRouter()


class GenerateRequest(BaseModel):
    session_id: str


@router.post("/generate")
async def generate(request: GenerateRequest, user: CurrentUser):
    try:
        if not get_tryon_session(request.session_id, user["id"]):
            raise HTTPException(status_code=404, detail="Session not found")
        images = store.get_images(request.session_id)
        if not images["person"] or not images["outfit"]:
            raise HTTPException(status_code=400, detail="Both person and outfit images are required")
        update_tryon_session(request.session_id, user["id"], status="processing")

        generation_result = await generate_try_on(
            images["person"]["bytes"],
            images["person"]["content_type"],
            images["outfit"]["bytes"],
            images["outfit"]["content_type"],
            session_id=request.session_id,
        )
        result_bytes = generation_result["image_bytes"]
        usage = generation_result.get("usage", {})
        path = save_result(request.session_id, result_bytes)
        store.save_result(request.session_id, {"path": path, "usage": usage})
        update_tryon_session(request.session_id, user["id"], status="completed")
        logger.info("Generated result for session %s with usage %s", request.session_id, usage)
        return {
            "status": "ok",
            "session_id": request.session_id,
            "result_url": f"/api/results/{request.session_id}",
            "usage": usage,
            "usage_totals": store.get_usage_totals(request.session_id),
        }
    except HTTPException:
        raise
    except ImageGenerationError as exc:
        try:
            update_tryon_session(request.session_id, user["id"], status="failed", error_message=str(exc))
        except Exception:
            pass
        logger.warning("Image generation unavailable for session %s: %s", request.session_id, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        try:
            update_tryon_session(request.session_id, user["id"], status="failed", error_message="Generation failed")
        except Exception:
            pass
        logger.exception("Generation failed for session %s", request.session_id)
        raise HTTPException(status_code=502, detail="Try-on generation failed. Please retry with a clear photo.") from exc
