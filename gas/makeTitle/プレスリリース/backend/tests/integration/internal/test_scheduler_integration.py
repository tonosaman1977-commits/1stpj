"""scheduler.py の内部結合テスト（実SQLiteDB使用・外部APIはモック）。"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

import auth as auth_utils
import crypto
import models
import scheduler as sched_module
from database import SessionLocal


@pytest.fixture
def db_session(setup_db):
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_with_theme(db_session):
    user = models.User(
        id='sched-user-1',
        email='sched@example.com',
        name='スケジューラーテストユーザー',
        password_hash=auth_utils.hash_password('pass'),
        role='user',
    )
    theme = models.PostTheme(
        id='sched-theme-1',
        user_id='sched-user-1',
        name='テストテーマ',
        description='テスト説明',
        is_active=True,
    )
    db_session.add(user)
    db_session.add(theme)
    db_session.commit()
    return user


@pytest.fixture
def slot(db_session, user_with_theme):
    s = models.ScheduleSlot(
        user_id=user_with_theme.id,
        time='09:00',
        enabled=True,
    )
    db_session.add(s)
    db_session.commit()
    return s


@pytest.fixture
def sns_conn(db_session, user_with_theme):
    conn = models.SnsConnection(
        user_id=user_with_theme.id,
        platform='threads',
        sns_user_id='sns-001',
        access_token_encrypted=crypto.encrypt_token('real-token'),
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        is_expired=False,
    )
    db_session.add(conn)
    db_session.commit()
    return conn


# ─────────────────────── run_posting_job ───────────────────────

class TestPostingJobIntegration:
    def test_posting_job_success_creates_history(self, slot, sns_conn, db_session):
        """SNS連携ありの場合、PostHistoryが正常に記録される。"""
        with patch('scheduler.datetime') as mock_dt, \
             patch('scheduler.gemini_service.generate_post_content', return_value='テスト投稿'), \
             patch('scheduler.threads_service.post_to_threads') as mock_post:
            mock_dt.now.return_value.strftime.return_value = '09:00'
            mock_dt.now.return_value.__class__ = datetime
            sched_module.run_posting_job()

        mock_post.assert_called_once_with('テスト投稿', 'real-token', 'sns-001')

        history = db_session.query(models.PostHistory).filter(
            models.PostHistory.user_id == 'sched-user-1'
        ).first()
        assert history is not None
        assert history.status == 'success'
        assert history.content == 'テスト投稿'

    def test_posting_job_no_sns_connection_records_failure(self, slot, db_session):
        """SNS連携なしの場合、PostHistoryにfailedが記録される。"""
        with patch('scheduler.datetime') as mock_dt, \
             patch('scheduler.gemini_service.generate_post_content', return_value='内容'), \
             patch('scheduler.threads_service.post_to_threads') as mock_post:
            mock_dt.now.return_value.strftime.return_value = '09:00'
            mock_dt.now.return_value.__class__ = datetime
            sched_module.run_posting_job()

        mock_post.assert_not_called()

        history = db_session.query(models.PostHistory).filter(
            models.PostHistory.user_id == 'sched-user-1'
        ).first()
        assert history is not None
        assert history.status == 'failed'
        assert 'Threads連携' in history.error_message

    def test_posting_job_expired_connection_records_failure(self, slot, db_session, user_with_theme):
        """期限切れトークンの場合、PostHistoryにfailedが記録される。"""
        expired_conn = models.SnsConnection(
            user_id=user_with_theme.id,
            platform='threads',
            sns_user_id='sns-001',
            access_token_encrypted=crypto.encrypt_token('expired-token'),
            token_expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            is_expired=True,
        )
        db_session.add(expired_conn)
        db_session.commit()

        with patch('scheduler.datetime') as mock_dt, \
             patch('scheduler.gemini_service.generate_post_content', return_value='内容'), \
             patch('scheduler.threads_service.post_to_threads') as mock_post:
            mock_dt.now.return_value.strftime.return_value = '09:00'
            mock_dt.now.return_value.__class__ = datetime
            sched_module.run_posting_job()

        mock_post.assert_not_called()
        history = db_session.query(models.PostHistory).filter(
            models.PostHistory.user_id == 'sched-user-1'
        ).first()
        assert history.status == 'failed'

    def test_posting_job_disabled_slot_skipped(self, db_session, user_with_theme, sns_conn):
        """無効なスロットはスキップされる。"""
        disabled_slot = models.ScheduleSlot(
            user_id=user_with_theme.id,
            time='09:00',
            enabled=False,
        )
        db_session.add(disabled_slot)
        db_session.commit()

        with patch('scheduler.datetime') as mock_dt, \
             patch('scheduler.threads_service.post_to_threads') as mock_post:
            mock_dt.now.return_value.strftime.return_value = '09:00'
            sched_module.run_posting_job()

        mock_post.assert_not_called()
        count = db_session.query(models.PostHistory).count()
        assert count == 0


# ─────────────────────── run_token_refresh_job ───────────────────────

class TestTokenRefreshJobIntegration:
    def test_refreshes_expiring_connection(self, sns_conn, db_session):
        """期限切れ間近のトークンがリフレッシュされる。"""
        sns_conn.token_expires_at = datetime.now(timezone.utc) + timedelta(days=3)
        db_session.commit()

        with patch('scheduler.threads_service.refresh_threads_token',
                   return_value={'access_token': 'new-refreshed-token', 'expires_in': 5183944}), \
             patch('scheduler.crypto.encrypt_token', return_value='enc-new') as mock_enc:
            sched_module.run_token_refresh_job()
            mock_enc.assert_called_once()

        db_session.refresh(sns_conn)
        assert sns_conn.access_token_encrypted == 'enc-new'
        # SQLiteはtimezone-naiveで返すため、naive同士で比較
        threshold = datetime.now() + timedelta(days=50)
        expires = sns_conn.token_expires_at
        if expires.tzinfo is not None:
            threshold = threshold.replace(tzinfo=timezone.utc)
        assert expires > threshold

    def test_does_not_refresh_non_expiring_tokens(self, sns_conn, db_session):
        """期限に余裕のあるトークンはリフレッシュされない。"""
        with patch('scheduler.threads_service.refresh_threads_token') as mock_refresh:
            sched_module.run_token_refresh_job()
        mock_refresh.assert_not_called()

    def test_does_not_refresh_already_expired(self, db_session, user_with_theme):
        """is_expired=Trueのトークンはリフレッシュ対象外。"""
        expired_conn = models.SnsConnection(
            user_id=user_with_theme.id,
            platform='threads',
            sns_user_id='sns-002',
            access_token_encrypted=crypto.encrypt_token('expired'),
            token_expires_at=datetime.now(timezone.utc) + timedelta(days=2),
            is_expired=True,
        )
        db_session.add(expired_conn)
        db_session.commit()

        with patch('scheduler.threads_service.refresh_threads_token') as mock_refresh:
            sched_module.run_token_refresh_job()
        mock_refresh.assert_not_called()


# ─────────────────────── run_token_expiry_check_job ───────────────────────

class TestTokenExpiryCheckJobIntegration:
    def test_marks_expired_tokens(self, db_session, user_with_theme):
        """期限切れのトークンにis_expired=Trueが設定される。"""
        conn = models.SnsConnection(
            user_id=user_with_theme.id,
            platform='threads',
            sns_user_id='sns-003',
            access_token_encrypted=crypto.encrypt_token('old'),
            token_expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            is_expired=False,
        )
        db_session.add(conn)
        db_session.commit()

        sched_module.run_token_expiry_check_job()

        db_session.refresh(conn)
        assert conn.is_expired is True

    def test_does_not_mark_valid_tokens(self, sns_conn, db_session):
        """有効期限内のトークンはis_expiredが変わらない。"""
        sched_module.run_token_expiry_check_job()

        db_session.refresh(sns_conn)
        assert sns_conn.is_expired is False

    def test_does_not_double_mark_already_expired(self, db_session, user_with_theme):
        """すでにis_expired=Trueのトークンは変更されない（既に除外フィルタ済み）。"""
        conn = models.SnsConnection(
            user_id=user_with_theme.id,
            platform='threads',
            sns_user_id='sns-004',
            access_token_encrypted=crypto.encrypt_token('old'),
            token_expires_at=datetime.now(timezone.utc) - timedelta(days=2),
            is_expired=True,
        )
        db_session.add(conn)
        db_session.commit()

        original_updated_at = conn.updated_at
        sched_module.run_token_expiry_check_job()

        db_session.refresh(conn)
        assert conn.is_expired is True
