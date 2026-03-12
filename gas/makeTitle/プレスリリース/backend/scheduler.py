import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import joinedload

import models
import services.gemini as gemini_service
import services.threads as threads_service
from database import SessionLocal

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


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
                logger.warning(f'user={slot.user_id}: アクティブなテーマがありません')
                continue

            content = ''
            status = 'success'
            error_message = None
            try:
                content = gemini_service.generate_post_content(
                    active_theme.name, active_theme.description
                )
                threads_service.post_to_threads(content)
            except Exception as e:
                status = 'failed'
                error_message = str(e)
                logger.error(f'投稿失敗 user={slot.user_id}: {e}')

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


def start_scheduler():
    scheduler.add_job(run_posting_job, CronTrigger(minute='*'), id='posting_job', replace_existing=True)
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
