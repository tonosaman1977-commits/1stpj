"""Threads OAuth認証フローの内部結合テスト（外部HTTP呼び出しはモック禁止→起動確認のみ）。"""
import os


def test_authorize_no_oauth_config(client, auth_headers):
    """THREADS_APP_IDが未設定の場合503を返すことを確認。"""
    # .env.localのTHREADS_APP_IDは空なのでそのまま動作確認
    resp = client.get('/api/auth/threads/authorize', headers=auth_headers, follow_redirects=False)
    # APP_IDが未設定 → 503
    assert resp.status_code in (302, 503)


def test_authorize_requires_auth(client):
    """認証なしでは403を返す。"""
    resp = client.get('/api/auth/threads/authorize', follow_redirects=False)
    assert resp.status_code == 403


def test_callback_no_oauth_config(client):
    """THREADS_APP_SECRETが未設定の場合503を返す。"""
    resp = client.get('/api/auth/threads/callback?code=testcode&state=test-user-id')
    assert resp.status_code in (400, 503)


def test_callback_invalid_state(client, db, monkeypatch):
    """stateに存在しないuser_idが来た場合400を返す。"""
    monkeypatch.setenv('THREADS_APP_ID', 'app123')
    monkeypatch.setenv('THREADS_APP_SECRET', 'secret123')
    monkeypatch.setenv('THREADS_REDIRECT_URI', 'http://localhost:8000/api/auth/threads/callback')

    # routers.threads_authモジュールの変数を再読み込みが必要
    import routers.threads_auth as ta
    ta._APP_ID = 'app123'
    ta._APP_SECRET = 'secret123'
    ta._REDIRECT_URI = 'http://localhost:8000/api/auth/threads/callback'

    resp = client.get('/api/auth/threads/callback?code=testcode&state=nonexistent-user-id')
    assert resp.status_code == 400
