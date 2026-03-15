from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db

router = APIRouter(prefix='/api/references', tags=['references'])
_MAX_SLOTS = 5


@router.get('', response_model=List[schemas.ReferenceResponse])
def list_references(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(models.BuzzReference).filter(
        models.BuzzReference.user_id == current_user.id,
    ).order_by(models.BuzzReference.slot_index.asc()).all()
    return [schemas.ReferenceResponse.from_model(r) for r in rows]


@router.put('', response_model=schemas.ReferenceResponse)
def upsert_reference(
    body: schemas.ReferenceUpsertRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(models.BuzzReference).filter(
        models.BuzzReference.user_id == current_user.id,
        models.BuzzReference.slot_index == str(body.slotIndex),
    ).first()

    if existing:
        existing.label = body.label
        existing.content = body.content
        db.commit()
        db.refresh(existing)
        return schemas.ReferenceResponse.from_model(existing)

    ref = models.BuzzReference(
        user_id=current_user.id,
        slot_index=str(body.slotIndex),
        label=body.label,
        content=body.content,
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return schemas.ReferenceResponse.from_model(ref)


@router.delete('/{slot_index}', status_code=status.HTTP_204_NO_CONTENT)
def delete_reference(
    slot_index: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    ref = db.query(models.BuzzReference).filter(
        models.BuzzReference.user_id == current_user.id,
        models.BuzzReference.slot_index == str(slot_index),
    ).first()
    if not ref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='リファレンスが見つかりません')
    db.delete(ref)
    db.commit()
    return None
