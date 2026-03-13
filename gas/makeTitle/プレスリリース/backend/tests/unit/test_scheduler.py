"""scheduler.py のユニットテスト（DBアクセスはモック）"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, call, patch

import pytest

import scheduler as sched_module


def _make_slot(user_id: str, theme_name: str = 'テーマ', theme_desc: str = '説明') -> MagicMock:
    theme = MagicMock()
    theme.id = 'theme-id'
    theme.name = theme_name
    theme.description = theme_desc
    theme.is_active = True

    user = MagicMock()
    user.themes = [theme]

    slot = MagicMock()
    slot.user_id = user_id
    slot.user = user
    return slot


def _make_conn(user_id: str, encrypted: str = 'enc-token', is_expired: bool = False) -> MagicMock:
    conn = MagicMock()
    conn.user_id = user_id
    conn.sns_user_id = 'sns-user-1'
    conn.access_token_encrypted = encrypted
    conn.is_expired = is_expired
    return conn


# ─────────────────────── run_posting_job ───────────────────────

class TestRunPostingJob:
    def test_posts_successfully_with_sns_connection(self):
        slot = _make_slot('user-1')
        conn = _make_conn('user-1', 'enc')
        db = MagicMock()
        db.query.return_value.options.return_value.filter.return_value.all.return_value = [slot]
        db.query.return_value.filter.return_value.first.return_value = conn

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.crypto.decrypt_token', return_value='plain-token'), \
             patch('scheduler.gemini_service.generate_post_content', return_value='投稿内容'), \
             patch('scheduler.threads_service.post_to_threads') as mock_post, \
             patch('scheduler.datetime') as mock_dt:
            mock_dt.now.return_value = MagicMock(strftime=MagicMock(return_value='09:00'))
            mock_dt.now.return_value.__class__ = datetime
            sched_module.run_posting_job()

        mock_post.assert_called_once_with('投稿内容', 'plain-token', 'sns-user-1')
        db.add.assert_called_once()
        db.commit.assert_called()

    def test_skips_when_no_active_theme(self):
        slot = _make_slot('user-1')
        slot.user.themes = []  # アクティブテーマなし

        db = MagicMock()
        db.query.return_value.options.return_value.filter.return_value.all.return_value = [slot]

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.threads_service.post_to_threads') as mock_post, \
             patch('scheduler.datetime') as mock_dt:
            mock_dt.now.return_value = MagicMock(strftime=MagicMock(return_value='09:00'))
            sched_module.run_posting_job()

        mock_post.assert_not_called()
        db.add.assert_not_called()

    def test_records_failure_when_no_sns_connection(self):
        slot = _make_slot('user-1')
        db = MagicMock()
        db.query.return_value.options.return_value.filter.return_value.all.return_value = [slot]
        db.query.return_value.filter.return_value.first.return_value = None  # 連携なし

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.gemini_service.generate_post_content', return_value='投稿内容'), \
             patch('scheduler.threads_service.post_to_threads') as mock_post, \
             patch('scheduler.datetime') as mock_dt:
            mock_dt.now.return_value = MagicMock(strftime=MagicMock(return_value='09:00'))
            sched_module.run_posting_job()

        mock_post.assert_not_called()
        added = db.add.call_args[0][0]
        assert added.status == 'failed'
        assert 'Threads連携' in added.error_message

    def test_records_failure_on_post_exception(self):
        slot = _make_slot('user-1')
        conn = _make_conn('user-1')
        db = MagicMock()
        db.query.return_value.options.return_value.filter.return_value.all.return_value = [slot]
        db.query.return_value.filter.return_value.first.return_value = conn

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.crypto.decrypt_token', return_value='plain-token'), \
             patch('scheduler.gemini_service.generate_post_content', return_value='内容'), \
             patch('scheduler.threads_service.post_to_threads', side_effect=Exception('API Error')), \
             patch('scheduler.datetime') as mock_dt:
            mock_dt.now.return_value = MagicMock(strftime=MagicMock(return_value='09:00'))
            sched_module.run_posting_job()

        added = db.add.call_args[0][0]
        assert added.status == 'failed'
        assert 'API Error' in added.error_message

    def test_db_closed_on_exception(self):
        db = MagicMock()
        db.query.side_effect = RuntimeError('DB Error')

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.datetime') as mock_dt:
            mock_dt.now.return_value = MagicMock(strftime=MagicMock(return_value='09:00'))
            with pytest.raises(RuntimeError):
                sched_module.run_posting_job()

        db.close.assert_called_once()


# ─────────────────────── run_token_refresh_job ───────────────────────

class TestRunTokenRefreshJob:
    def test_refreshes_expiring_tokens(self):
        conn = MagicMock()
        conn.user_id = 'user-1'
        conn.access_token_encrypted = 'enc-old'

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [conn]

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.crypto.decrypt_token', return_value='old-token'), \
             patch('scheduler.crypto.encrypt_token', return_value='enc-new'), \
             patch('scheduler.threads_service.refresh_threads_token',
                   return_value={'access_token': 'new-token', 'expires_in': 5183944}):
            sched_module.run_token_refresh_job()

        assert conn.access_token_encrypted == 'enc-new'
        db.commit.assert_called_once()

    def test_logs_error_on_refresh_failure(self, caplog):
        conn = MagicMock()
        conn.user_id = 'user-1'
        conn.access_token_encrypted = 'enc-old'

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [conn]

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.crypto.decrypt_token', return_value='old-token'), \
             patch('scheduler.threads_service.refresh_threads_token', side_effect=Exception('API Err')):
            sched_module.run_token_refresh_job()

        db.commit.assert_not_called()

    def test_skips_when_no_expiring_tokens(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        with patch('scheduler.SessionLocal', return_value=db), \
             patch('scheduler.threads_service.refresh_threads_token') as mock_refresh:
            sched_module.run_token_refresh_job()

        mock_refresh.assert_not_called()
        db.commit.assert_not_called()

    def test_db_closed_after_run(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        with patch('scheduler.SessionLocal', return_value=db):
            sched_module.run_token_refresh_job()

        db.close.assert_called_once()


# ─────────────────────── run_token_expiry_check_job ───────────────────────

class TestRunTokenExpiryCheckJob:
    def test_marks_expired_tokens(self):
        conn = MagicMock()
        conn.user_id = 'user-1'
        conn.platform = 'threads'
        conn.is_expired = False

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [conn]

        with patch('scheduler.SessionLocal', return_value=db):
            sched_module.run_token_expiry_check_job()

        assert conn.is_expired is True
        db.commit.assert_called_once()

    def test_no_commit_when_no_expired(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        with patch('scheduler.SessionLocal', return_value=db):
            sched_module.run_token_expiry_check_job()

        db.commit.assert_not_called()

    def test_db_closed_after_run(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        with patch('scheduler.SessionLocal', return_value=db):
            sched_module.run_token_expiry_check_job()

        db.close.assert_called_once()

    def test_marks_multiple_expired_tokens(self):
        conns = [MagicMock(user_id=f'user-{i}', platform='threads', is_expired=False) for i in range(3)]
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = conns

        with patch('scheduler.SessionLocal', return_value=db):
            sched_module.run_token_expiry_check_job()

        for conn in conns:
            assert conn.is_expired is True
        db.commit.assert_called_once()
