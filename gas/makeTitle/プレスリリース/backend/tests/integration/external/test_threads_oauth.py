"""Threads OAuth外部結合テスト。THREADS_APP_IDが設定されている場合のみ実行。"""
import os

import pytest


@pytest.mark.skipif(
    not os.getenv('THREADS_APP_ID') or not os.getenv('THREADS_APP_SECRET'),
    reason='THREADS_APP_IDおよびTHREADS_APP_SECRETが未設定',
)
def test_threads_authorize_redirects(client, auth_headers):
    """authorizeエンドポイントがThreads OAuthページへリダイレクトすることを確認。"""
    resp = client.get('/api/auth/threads/authorize', headers=auth_headers, follow_redirects=False)
    assert resp.status_code == 302
    assert 'threads.net/oauth/authorize' in resp.headers.get('location', '')


@pytest.mark.skipif(
    not os.getenv('THREADS_APP_ID') or not os.getenv('THREADS_APP_SECRET'),
    reason='THREADS_APP_IDおよびTHREADS_APP_SECRETが未設定',
)
def test_threads_callback_invalid_code(client):
    """無効なcodeを送ると502を返すことを確認。"""
    resp = client.get('/api/auth/threads/callback?code=invalid_code&state=test-user-id')
    assert resp.status_code in (400, 502)
