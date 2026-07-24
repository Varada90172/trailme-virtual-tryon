from fastapi import APIRouter

from .dependencies import VendorUser
from ..utils.db import list_tryon_sessions

router = APIRouter()


@router.get("/dashboard/sessions")
async def get_dashboard_sessions(user: VendorUser):
    """Return only sessions owned by the signed-in vendor."""
    records = []
    for session in list_tryon_sessions(user["id"]):
        session_id = session["session_id"]
        records.append({
            "session_id": session_id,
            "store_id": user.get("vendor_id"),
            "product_id": session.get("product_id"),
            "status": session["status"],
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
            "storage": {
                "inputs": {
                    "person": {"path": f"api/sessions/{session_id}/person"},
                    "outfit": {"path": f"api/sessions/{session_id}/outfit"},
                },
                "output": {"path": f"/api/results/{session_id}"} if session["status"] == "completed" else None,
            },
            "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0},
            "sale_status": session.get("sale_status", "no_action"),
        })
    return records
