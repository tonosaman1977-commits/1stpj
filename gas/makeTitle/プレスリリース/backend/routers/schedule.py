import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/api/schedule', tags=['schedule'])

DEFAULT_TIMES = ['07:00', '10:00', '13:00', '17:00', '21:00']


def _get_or_create_slots(user_id: str, db: Session) -> List[models.ScheduleSlot]:
    slots = (
        db.query(models.ScheduleSlot)
        .filter(models.ScheduleSlot.user_id == user_id)
        .order_by(models.ScheduleSlot.time)
        .all()
    )
    if not slots:
        try:
            slots = [models.ScheduleSlot(user_id=user_id, time=t, enabled=True) for t in DEFAULT_TIMES]
            db.add_all(slots)
            db.commit()
            for s in slots:
                db.refresh(s)
        except Exception:
            db.rollback()
            raise
    return slots


@router.get('', response_model=List[schemas.ScheduleSlotResponse])
def get_schedule(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    slots = _get_or_create_slots(current_user.id, db)
    return [schemas.ScheduleSlotResponse.model_validate(s) for s in slots]


@router.put('', response_model=List[schemas.ScheduleSlotResponse])
def update_schedule(
    data: schemas.ScheduleUpdateRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    try:
        for slot_data in data.slots:
            slot = (
                db.query(models.ScheduleSlot)
                .filter(
                    models.ScheduleSlot.id == slot_data.id,
                    models.ScheduleSlot.user_id == current_user.id,
                )
                .first()
            )
            if not slot:
                raise HTTPException(status_code=404, detail='スロットが見つかりません')
            slot.time = slot_data.time
            slot.enabled = slot_data.enabled
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.error('スケジュール更新失敗', exc_info=True)
        raise HTTPException(status_code=500, detail='スケジュールの更新に失敗しました')
    slots = (
        db.query(models.ScheduleSlot)
        .filter(models.ScheduleSlot.user_id == current_user.id)
        .order_by(models.ScheduleSlot.time)
        .all()
    )
    return [schemas.ScheduleSlotResponse.model_validate(s) for s in slots]
