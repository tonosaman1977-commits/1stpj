import os

import pytest

import services.threads as threads_service


@pytest.mark.skipif(
    not os.getenv('THREADS_ACCESS_TOKEN'),
    reason='Threads API認証情報が未設定',
)
def test_refresh_threads_token_real():
    """実Threads APIでトークンリフレッシュをテスト。認証情報が設定されている場合のみ実行。"""
    result = threads_service.refresh_threads_token(os.getenv('THREADS_ACCESS_TOKEN'))
    assert 'access_token' in result
    assert isinstance(result['access_token'], str)
    assert len(result['access_token']) > 0
