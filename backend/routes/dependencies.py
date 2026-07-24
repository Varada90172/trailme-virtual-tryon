from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status

try:
    from ..utils.db import get_user_by_session
except ImportError:  # pragma: no cover
    from utils.db import get_user_by_session


async def require_current_user(trailme_session: str | None = Cookie(default=None)) -> dict:
    user = get_user_by_session(trailme_session) if trailme_session else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in is required")
    return user


CurrentUser = Annotated[dict, Depends(require_current_user)]


def require_vendor(user: CurrentUser) -> dict:
    if user["role"] != "vendor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor access is required")
    return user


VendorUser = Annotated[dict, Depends(require_vendor)]
