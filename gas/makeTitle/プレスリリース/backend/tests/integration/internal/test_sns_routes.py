"""SNS連携管理エンドポイントの内部結合テスト（実DB使用）。"""
from datetime import datetime, timedelta, timezone

import models
import crypto


def test_sns_status_not_connected(client, auth_headers):
    resp = client.get('/api/sns/status', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data['connected'] is False
    assert data['platform'] == 'threads'
    assert data['sns_user_id'] is None
    assert data['token_expires_at'] is None
    assert data['is_expired'] is False


def test_sns_status_connected(client, auth_headers, db, test_user):
    conn = models.SnsConnection(
        user_id=test_user.id,
        platform='threads',
        sns_user_id='999',
        access_token_encrypted=crypto.encrypt_token('tok_abc'),
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        is_expired=False,
    )
    db.add(conn)
    db.commit()

    resp = client.get('/api/sns/status', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data['connected'] is True
    assert data['sns_user_id'] == '999'
    assert data['is_expired'] is False
    assert data['token_expires_at'] is not None


def test_sns_status_expired(client, auth_headers, db, test_user):
    conn = models.SnsConnection(
        user_id=test_user.id,
        platform='threads',
        sns_user_id='999',
        access_token_encrypted=crypto.encrypt_token('tok_old'),
        token_expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        is_expired=True,
    )
    db.add(conn)
    db.commit()

    resp = client.get('/api/sns/status', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data['is_expired'] is True


def test_sns_disconnect_no_connection(client, auth_headers):
    resp = client.delete('/api/sns/disconnect', headers=auth_headers)
    assert resp.status_code == 204


def test_sns_disconnect_removes_connection(client, auth_headers, db, test_user):
    conn = models.SnsConnection(
        user_id=test_user.id,
        platform='threads',
        sns_user_id='999',
        access_token_encrypted=crypto.encrypt_token('tok_abc'),
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        is_expired=False,
    )
    db.add(conn)
    db.commit()

    resp = client.delete('/api/sns/disconnect', headers=auth_headers)
    assert resp.status_code == 204

    # 削除確認
    status_resp = client.get('/api/sns/status', headers=auth_headers)
    assert status_resp.json()['connected'] is False


def test_sns_status_requires_auth(client):
    resp = client.get('/api/sns/status')
    assert resp.status_code == 403


def test_sns_disconnect_requires_auth(client):
    resp = client.delete('/api/sns/disconnect')
    assert resp.status_code == 403


def test_sns_status_isolation_between_users(client, db, test_user):
    """他ユーザーのSNS連携が見えないことを確認。"""
    other_user = models.User(
        id='other-user-id',
        email='other@example.com',
        name='他のユーザー',
        password_hash='dummy',
        role='user',
    )
    db.add(other_user)
    conn = models.SnsConnection(
        user_id=other_user.id,
        platform='threads',
        sns_user_id='other-sns-id',
        access_token_encrypted=crypto.encrypt_token('tok_other'),
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        is_expired=False,
    )
    db.add(conn)
    db.commit()

    import auth as auth_utils
    token = auth_utils.create_access_token(test_user.id)
    headers = {'Authorization': f'Bearer {token}'}

    resp = client.get('/api/sns/status', headers=headers)
    assert resp.status_code == 200
    assert resp.json()['connected'] is False
