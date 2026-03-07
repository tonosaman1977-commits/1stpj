from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db

router = APIRouter(prefix='/api/themes', tags=['themes'])


@router.get('', response_model=List[schemas.ThemeResponse])
def list_themes(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    themes = (
        db.query(models.PostTheme)
        .filter(models.PostTheme.user_id == current_user.id)
        .order_by(models.PostTheme.created_at)
        .all()
    )
    return [schemas.ThemeResponse.from_model(t) for t in themes]


@router.post('', response_model=schemas.ThemeResponse, status_code=status.HTTP_201_CREATED)
def create_theme(
    data: schemas.ThemeCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    theme = models.PostTheme(user_id=current_user.id, name=data.name, description=data.description)
    db.add(theme)
    db.commit()
    db.refresh(theme)
    return schemas.ThemeResponse.from_model(theme)


@router.put('/{theme_id}', response_model=schemas.ThemeResponse)
def update_theme(
    theme_id: str,
    data: schemas.ThemeUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    theme = (
        db.query(models.PostTheme)
        .filter(models.PostTheme.id == theme_id, models.PostTheme.user_id == current_user.id)
        .first()
    )
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='テーマが見つかりません')
    theme.name = data.name
    theme.description = data.description
    db.commit()
    db.refresh(theme)
    return schemas.ThemeResponse.from_model(theme)


@router.delete('/{theme_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_theme(
    theme_id: str,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    theme = (
        db.query(models.PostTheme)
        .filter(models.PostTheme.id == theme_id, models.PostTheme.user_id == current_user.id)
        .first()
    )
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='テーマが見つかりません')
    db.delete(theme)
    db.commit()
    return None


@router.post('/{theme_id}/activate', response_model=schemas.ThemeResponse)
def activate_theme(
    theme_id: str,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    theme = (
        db.query(models.PostTheme)
        .filter(models.PostTheme.id == theme_id, models.PostTheme.user_id == current_user.id)
        .first()
    )
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='テーマが見つかりません')
    # Deactivate all, then activate target
    db.query(models.PostTheme).filter(models.PostTheme.user_id == current_user.id).update(
        {'is_active': False}
    )
    theme.is_active = True
    db.commit()
    db.refresh(theme)
    return schemas.ThemeResponse.from_model(theme)
