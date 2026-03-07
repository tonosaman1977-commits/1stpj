import models


def test_list_themes_empty(client, test_user, auth_headers):
    resp = client.get('/api/themes', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_theme(client, test_user, auth_headers):
    resp = client.post('/api/themes', json={'name': 'テーマ1', 'description': '説明1'}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data['name'] == 'テーマ1'
    assert data['isActive'] is False
    assert 'id' in data
    assert 'createdAt' in data


def test_create_theme_unauthenticated(client):
    resp = client.post('/api/themes', json={'name': 'テーマ', 'description': '説明'})
    assert resp.status_code == 403


def test_update_theme(client, test_user, auth_headers, db):
    theme = models.PostTheme(user_id=test_user.id, name='旧名前', description='旧説明')
    db.add(theme)
    db.commit()

    resp = client.put(f'/api/themes/{theme.id}', json={'name': '新名前', 'description': '新説明'}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()['name'] == '新名前'


def test_update_theme_not_found(client, test_user, auth_headers):
    resp = client.put('/api/themes/nonexistent', json={'name': 'x', 'description': 'y'}, headers=auth_headers)
    assert resp.status_code == 404


def test_delete_theme(client, test_user, auth_headers, db):
    theme = models.PostTheme(user_id=test_user.id, name='削除テーマ', description='説明')
    db.add(theme)
    db.commit()
    theme_id = theme.id

    resp = client.delete(f'/api/themes/{theme_id}', headers=auth_headers)
    assert resp.status_code == 204
    assert db.query(models.PostTheme).filter(models.PostTheme.id == theme_id).first() is None


def test_delete_theme_not_found(client, test_user, auth_headers):
    resp = client.delete('/api/themes/nonexistent', headers=auth_headers)
    assert resp.status_code == 404


def test_activate_theme_switches_active(client, test_user, auth_headers, db):
    theme1 = models.PostTheme(user_id=test_user.id, name='テーマ1', description='説明1', is_active=True)
    theme2 = models.PostTheme(user_id=test_user.id, name='テーマ2', description='説明2', is_active=False)
    db.add_all([theme1, theme2])
    db.commit()

    resp = client.post(f'/api/themes/{theme2.id}/activate', headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()['isActive'] is True

    db.refresh(theme1)
    assert theme1.is_active is False


def test_cannot_access_other_user_theme(client, test_user, auth_headers, db):
    other = models.User(id='other-id', email='other@example.com', name='他', password_hash='x', role='user')
    db.add(other)
    db.commit()
    theme = models.PostTheme(user_id='other-id', name='他のテーマ', description='説明')
    db.add(theme)
    db.commit()

    resp = client.delete(f'/api/themes/{theme.id}', headers=auth_headers)
    assert resp.status_code == 404
