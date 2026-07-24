import os
from typing import Literal, Optional

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel, Field

from ..utils.db import create_session, create_user, delete_session, get_user_by_identifier, get_user_by_session
from ..utils.auth import hash_password, verify_password

router = APIRouter()
SESSION_COOKIE = "trailme_session"


class UserRegister(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=100)
    role: Literal["vendor", "customer"] = "customer"
    phone: str = Field(default="", max_length=30)
    business_name: str = Field(default="", max_length=150)


class UserLogin(BaseModel):
    identifier: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1, max_length=128)
    role: Optional[Literal["vendor", "customer"]] = None


def user_payload(user: dict) -> dict:
    return {
        "id": user["id"], "email": user["email"], "display_name": user["display_name"],
        "role": user["role"], "vendor_id": user.get("vendor_id"), "business_name": user.get("business_name"),
    }


def set_session(response: Response, user: dict) -> None:
    response.set_cookie(
        key=SESSION_COOKIE, value=create_session(user["id"]), httponly=True,
        samesite="lax", secure=os.getenv("ENVIRONMENT", "development").lower() == "production",
        max_age=60 * 60 * 24 * 7, path="/",
    )


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister, response: Response):
    if "@" not in user.email or user.email.startswith("@"):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if user.role == "vendor" and not user.business_name.strip():
        raise HTTPException(status_code=400, detail="Business name is required for vendor registration")
    created = create_user(
        user.email, hash_password(user.password), user.display_name, user.role, user.phone, user.business_name,
    )
    if not created:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    set_session(response, created)
    return {"status": "ok", "user": user_payload(created)}


@router.post("/auth/login")
async def login(user: UserLogin, response: Response):
    db_user = get_user_by_identifier(user.identifier)
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.role and db_user["role"] != user.role:
        raise HTTPException(status_code=403, detail="This account is registered for a different role")
    set_session(response, db_user)
    return {"status": "ok", "user": user_payload(db_user)}


@router.get("/auth/me")
async def current_user(trailme_session: Optional[str] = Cookie(default=None)):
    user = get_user_by_session(trailme_session) if trailme_session else None
    if not user:
        raise HTTPException(status_code=401, detail="Not signed in")
    return {"user": user_payload(user)}


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, trailme_session: Optional[str] = Cookie(default=None)):
    if trailme_session:
        delete_session(trailme_session)
    response.delete_cookie(SESSION_COOKIE, path="/")
