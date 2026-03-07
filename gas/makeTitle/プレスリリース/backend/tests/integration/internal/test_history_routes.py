from datetime import datetime, timezone

import models


def test_get_history_empty(client, test_user, auth_headers):
    resp = client.get('/api/history', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_history_unauthenticated(client):
    resp = client.get('/api/history')
    assert resp.status_code == 403


def test_get_history_with_data(client, test_user, auth_headers, db):
    history = models.PostHistory(
        user_id=test_user.id,
        theme_name='テーマA',
        content='投稿内容テスト',
        posted_at=datetime.now(timezone.utc),
        status='success',
    )
    db.add(history)
    db.commit()

    resp = client.get('/api/history', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]['themeName'] == 'テーマA'
    assert data[0]['status'] == 'success'
    assert 'postedAt' in data[0]


def test_get_history_failed_entry(client, test_user, auth_headers, db):
    history = models.PostHistory(
        user_id=test_user.id,
        theme_name='テーマB',
        content='生成エラー: timeout',
        posted_at=datetime.now(timezone.utc),
        status='failed',
        error_message='timeout',
    )
    db.add(history)
    db.commit()

    resp = client.get('/api/history', headers=auth_headers)
    data = resp.json()
    assert data[0]['status'] == 'failed'
    assert data[0]['errorMessage'] == 'timeout'


def test_history_only_shows_own(client, test_user, auth_headers, db):
    other = models.User(id='other3-id', email='other3@example.com', name='他3', password_hash='x', role='user')
    db.add(other)
    db.commit()

    other_history = models.PostHistory(
        user_id='other3-id',
        theme_name='他のテーマ',
        content='他の投稿',
        posted_at=datetime.now(timezone.utc),
        status='success',
    )
    db.add(other_history)
    db.commit()

    resp = client.get('/api/history', headers=auth_headers)
    assert resp.json() == []
