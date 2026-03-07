from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login', response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not auth_utils.verify_password(request.password, user.password_hash):
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
