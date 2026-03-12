import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db
from limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login', response_model=schemas.LoginResponse)
@limiter.limit('5/minute')
def login(request: Request, body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth_utils.verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='メールアドレスまたはパスワードが正しくありません',
        )
    token = auth_utils.create_access_token(user.id)
    return schemas.LoginResponse(user=schemas.UserResponse.model_validate(user), token=token)


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: models.User = Depends(auth_utils.get_current_user)):
    # JWT is stateless; client discards the token
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
