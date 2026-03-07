def test_login_success(client, test_user):
    resp = client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'password123'})
    assert resp.status_code == 200
    data = resp.json()
    assert 'token' in data
    assert data['user']['email'] == 'test@example.com'
    assert data['user']['role'] == 'user'


def test_login_wrong_password(client, test_user):
    resp = client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'wrong'})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post('/api/auth/login', json={'email': 'nobody@example.com', 'password': 'pass'})
    assert resp.status_code == 401


def test_logout_success(client, test_user, auth_headers):
    resp = client.post('/api/auth/logout', headers=auth_headers)
    assert resp.status_code == 204


def test_logout_unauthenticated(client):
    resp = client.post('/api/auth/logout')
    assert resp.status_code == 403


def test_me_success(client, test_user, auth_headers):
    resp = client.get('/api/auth/me', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data['email'] == 'test@example.com'
    assert data['id'] == 'test-user-id'


def test_me_unauthenticated(client):
    resp = client.get('/api/auth/me')
    assert resp.status_code == 403
