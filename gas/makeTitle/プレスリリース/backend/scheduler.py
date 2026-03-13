import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import joinedload

import crypto
import models
import services.gemini as gemini_service
import services.threads as threads_service
from database import SessionLocal

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

_REFRESH_THRESHOLD_DAYS = 7
_TOKEN_TTL_DAYS = 60


def run_posting_job():
    """スケジュールに一致するユーザーの投稿を実行する。"""
    db = SessionLocal()
    try:
        now_time = datetime.now(ZoneInfo('Asia/Tokyo')).strftime('%H:%M')
        slots = (
            db.query(models.ScheduleSlot)
            .options(joinedload(models.ScheduleSlot.user).joinedload(models.User.themes))
            .filter(models.ScheduleSlot.time == now_time, models.ScheduleSlot.enabled == True)  # noqa: E712
            .all()
        )

        for slot in slots:
            active_theme = next(
                (t for t in slot.user.themes if t.is_active),
                None,
            )
            if not active_theme:
                logger.warning('user=%s: アクティブなテーマがありません', slot.user_id)
                continue

            conn = db.query(models.SnsConnection).filter(
                models.SnsConnection.user_id == slot.user_id,
                models.SnsConnection.platform == 'threads',
                models.SnsConnection.is_expired == False,  # noqa: E712
            ).first()

            content = ''
            status = 'success'
            error_message = None
            try:
                if not conn:
                    raise ValueError('Threads連携が設定されていないか、トークンが期限切れです')
                access_token = crypto.decrypt_token(conn.access_token_encrypted)
                content = gemini_service.generate_post_content(
                    active_theme.name, active_theme.description
                )
                threads_service.post_to_threads(content, access_token, conn.sns_user_id)
            except Exception as e:
                status = 'failed'
                error_message = str(e)
                logger.error('投稿失敗 user=%s: %s', slot.user_id, e)

            history = models.PostHistory(
                user_id=slot.user_id,
                theme_id=active_theme.id,
                theme_name=active_theme.name,
                content=content or f'生成エラー: {error_message}',
                posted_at=datetime.now(timezone.utc),
                status=status,
                error_message=error_message,
            )
            db.add(history)
            db.commit()
    finally:
        db.close()


def run_token_refresh_job():
    """期限切れ間近のトークンを自動リフレッシュする（毎日AM2時実行）。"""
    db = SessionLocal()
    try:
        threshold = datetime.now(timezone.utc) + timedelta(days=_REFRESH_THRESHOLD_DAYS)
        connections = db.query(models.SnsConnection).filter(
            models.SnsConnection.platform == 'threads',
            models.SnsConnection.is_expired == False,  # noqa: E712
            models.SnsConnection.token_expires_at <= threshold,
        ).all()

        for conn in connections:
            try:
                access_token = crypto.decrypt_token(conn.access_token_encrypted)
                result = threads_service.refresh_threads_token(access_token)
                new_token = result['access_token']
                conn.access_token_encrypted = crypto.encrypt_token(new_token)
                conn.token_expires_at = datetime.now(timezone.utc) + timedelta(days=_TOKEN_TTL_DAYS)
                conn.updated_at = datetime.now(timezone.utc)
                db.commit()
                logger.info('トークンリフレッシュ成功: user_id=%s', conn.user_id)
            except Exception as e:
                logger.error('トークンリフレッシュ失敗: user_id=%s, error=%s', conn.user_id, e)
    finally:
        db.close()


def run_token_expiry_check_job():
    """期限切れトークンにフラグを立て、ログに記録する（毎時実行）。"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired = db.query(models.SnsConnection).filter(
            models.SnsConnection.token_expires_at < now,
            models.SnsConnection.is_expired == False,  # noqa: E712
        ).all()

        for conn in expired:
            conn.is_expired = True
            conn.updated_at = now
            logger.warning('トークン期限切れ: user_id=%s, platform=%s', conn.user_id, conn.platform)

        if expired:
            db.commit()
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(run_posting_job, CronTrigger(minute='*'), id='posting_job', replace_existing=True)
    scheduler.add_job(
        run_token_refresh_job, CronTrigger(hour='2', minute='0'),
        id='token_refresh_job', replace_existing=True,
    )
    scheduler.add_job(
        run_token_expiry_check_job, CronTrigger(minute='0'),
        id='token_expiry_job', replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
