import os

import pytest

import services.threads as threads_service


@pytest.mark.skipif(
    not os.getenv('THREADS_ACCESS_TOKEN') or not os.getenv('THREADS_USER_ID'),
    reason='Threads API認証情報が未設定',
)
def test_post_to_threads_real():
    """実Threads APIへの投稿テスト。認証情報が設定されている場合のみ実行。"""
    content = '自動テスト投稿 #テスト #自動投稿'
    post_id = threads_service.post_to_threads(content)
    assert isinstance(post_id, str)
    assert len(post_id) > 0
