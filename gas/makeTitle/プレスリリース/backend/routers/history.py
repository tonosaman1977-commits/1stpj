import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

import auth as auth_utils
import models
import schemas
from database import get_db

router = APIRouter(prefix='/api/history', tags=['history'])


@router.get('', response_model=List[schemas.HistoryResponse])
def get_history(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    histories = (
        db.query(models.PostHistory)
        .filter(models.PostHistory.user_id == current_user.id)
        .order_by(models.PostHistory.posted_at.desc())
        .all()
    )
    return [schemas.HistoryResponse.from_model(h) for h in histories]
