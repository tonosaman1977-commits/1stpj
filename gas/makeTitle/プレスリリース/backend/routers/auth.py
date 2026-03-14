import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db
from limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/register', response_model=schemas.LoginResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit('5/minute')
def register(request: Request, body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """新規ユーザー登録（要件7: マルチユーザー対応）。"""
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='このメールアドレスはすでに登録されています',
        )
    user = models.User(
        email=body.email,
        name=body.name,
        password_hash=auth_utils.hash_password(body.password),
        role='user',
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = auth_utils.create_access_token(user.id)
    logger.info('新規登録: user_id=%s email=%s', user.id, user.email)
    return schemas.LoginResponse(user=schemas.UserResponse.model_validate(user), token=token)


@router.post('/login', response_model=schemas.LoginResponse)
@limiter.limit('5/minute')
def login(request: Request, body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth_utils.verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='メールアドレスまたはパスワードが正しくありません',
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='このアカウントは無効化されています',
        )
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    token = auth_utils.create_access_token(user.id)
    return schemas.LoginResponse(user=schemas.UserResponse.model_validate(user), token=token)


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: models.User = Depends(auth_utils.get_current_user)):
    return None


@router.get('/me', response_model=schemas.UserResponse)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return schemas.UserResponse.model_validate(current_user)


@router.delete('/me', status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    logger.info('ユーザー削除: user_id=%s', current_user.id)
    db.delete(current_user)
    db.commit()
    return None


# ── Admin (role=admin のみ) ────────────────────────────────────────────────────

def _require_admin(current_user: models.User = Depends(auth_utils.get_current_user)) -> models.User:
    if current_user.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='管理者権限が必要です')
    return current_user


@router.get('/admin/users', response_model=List[schemas.UserResponse])
def list_users(
    admin: models.User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    return [schemas.UserResponse.model_validate(u) for u in db.query(models.User).all()]


@router.patch('/admin/users/{user_id}/deactivate', status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: str,
    admin: models.User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='ユーザーが見つかりません')
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='自分自身は無効化できません')
    user.is_active = False
    db.commit()
    logger.info('ユーザー無効化: admin=%s target=%s', admin.id, user_id)
    return None
