"""
スケジューラー: トークン管理のみ担当。
投稿実行・下書き生成はCloud Schedulerがエンドポイントを呼び出す方式に移行済み。
  - 投稿実行: Cloud Scheduler → POST /api/posts/internal/run-due（毎分）
  - 下書き自動生成: Cloud Scheduler → POST /api/posts/internal/generate-drafts（1日3回）
"""
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

import crypto
import models
import services.threads as threads_service
from database import SessionLocal

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

_REFRESH_THRESHOLD_DAYS = 7
_TOKEN_TTL_DAYS = 60


def run_token_refresh_job():
    """期限切れ間近のトークンをリフレッシュする（毎日AM2時）。"""
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
                conn.access_token_encrypted = crypto.encrypt_token(result['access_token'])
                conn.token_expires_at = datetime.now(timezone.utc) + timedelta(days=_TOKEN_TTL_DAYS)
                conn.updated_at = datetime.now(timezone.utc)
                db.commit()
                logger.info('トークンリフレッシュ成功: user_id=%s', conn.user_id)
            except Exception as e:
                logger.error('トークンリフレッシュ失敗: user_id=%s error=%s', conn.user_id, e)
    finally:
        db.close()


def run_token_expiry_check_job():
    """期限切れトークンにフラグを立てる（毎時）。"""
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
            logger.warning('トークン期限切れ: user_id=%s', conn.user_id)
        if expired:
            db.commit()
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        run_token_refresh_job,
        CronTrigger(hour='2', minute='0'),
        id='token_refresh_job',
        replace_existing=True,
    )
    scheduler.add_job(
        run_token_expiry_check_job,
        CronTrigger(minute='0'),
        id='token_expiry_job',
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
