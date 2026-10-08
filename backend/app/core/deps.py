"""
FastAPI dependencies for authentication and authorization.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    token_query: Optional[str] = Query(default=None, alias="token"),
    db: Session = Depends(get_db),
) -> User:
    """
    Verify JWT token from either:
    - Authorization: Bearer <token>  header  (API clients, fetch)
    - ?token=<token>                 query param  (<video src>, <a href>, <audio src>)
    """
    raw_token: Optional[str] = None

    if credentials:
        raw_token = credentials.credentials
    elif token_query:
        raw_token = token_query

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_access_token(raw_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
