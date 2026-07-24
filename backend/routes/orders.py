from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from .dependencies import CurrentUser
    from ..utils.db import create_order, get_tryon_session, update_tryon_session
except ImportError:  # pragma: no cover
    from routes.dependencies import CurrentUser
    from utils.db import create_order, get_tryon_session, update_tryon_session

router = APIRouter()


class CreateOrderRequest(BaseModel):
    product_id: str
    session_id: str | None = None
    customer_id: str | None = None


@router.post("/orders", status_code=201)
async def create_checkout_order(request: CreateOrderRequest, user: CurrentUser):
    if request.session_id and not get_tryon_session(request.session_id, user["id"]):
        raise HTTPException(status_code=404, detail="Try-on session not found")
    order = create_order(str(uuid4()), user["id"], request.product_id, request.session_id, request.customer_id)
    if request.session_id:
        update_tryon_session(request.session_id, user["id"], sale_status="purchased")
    return order
