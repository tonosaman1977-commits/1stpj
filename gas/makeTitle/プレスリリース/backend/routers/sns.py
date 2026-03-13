import logging

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import auth as auth_utils
import models
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/sns', tags=['sns'])


class SnsStatusResponse(BaseModel):
    connected: bool
    platform: str
    sns_user_id: str | None
    token_expires_at: str | None
    is_expired: bool


@router.get('/status', response_model=SnsStatusResponse)
def get_sns_status(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Threads連携ステータスを返す。"""
    conn = db.query(models.SnsConnection).filter(
        models.SnsConnection.user_id == current_user.id,
        models.SnsConnection.platform == 'threads',
    ).first()

    if not conn:
        return SnsStatusResponse(
            connected=False,
            platform='threads',
            sns_user_id=None,
            token_expires_at=None,
            is_expired=False,
        )

    return SnsStatusResponse(
        connected=True,
        platform='threads',
        sns_user_id=conn.sns_user_id,
        token_expires_at=conn.token_expires_at.isoformat() if conn.token_expires_at else None,
        is_expired=conn.is_expired,
    )


@router.delete('/disconnect', status_code=status.HTTP_204_NO_CONTENT)
def disconnect_sns(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Threads連携を解除する。"""
    conn = db.query(models.SnsConnection).filter(
        models.SnsConnection.user_id == current_user.id,
        models.SnsConnection.platform == 'threads',
    ).first()

    if conn:
        db.delete(conn)
        db.commit()
        logger.info('SNS連携解除: user_id=%s platform=threads', current_user.id)

    return None
