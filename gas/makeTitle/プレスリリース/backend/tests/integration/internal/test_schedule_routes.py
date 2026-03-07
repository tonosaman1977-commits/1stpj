def test_get_schedule_creates_defaults(client, test_user, auth_headers):
    resp = client.get('/api/schedule', headers=auth_headers)
    assert resp.status_code == 200
    slots = resp.json()
    assert len(slots) == 5
    times = [s['time'] for s in slots]
    assert '07:00' in times
    assert '21:00' in times


def test_get_schedule_unauthenticated(client):
    resp = client.get('/api/schedule')
    assert resp.status_code == 403


def test_get_schedule_idempotent(client, test_user, auth_headers):
    """2回呼んでも同じ5スロットが返る。"""
    resp1 = client.get('/api/schedule', headers=auth_headers)
    resp2 = client.get('/api/schedule', headers=auth_headers)
    assert len(resp1.json()) == len(resp2.json()) == 5


def test_update_schedule(client, test_user, auth_headers):
    get_resp = client.get('/api/schedule', headers=auth_headers)
    slots = get_resp.json()

    slots[0]['time'] = '08:30'
    slots[0]['enabled'] = False

    resp = client.put('/api/schedule', json={'slots': slots}, headers=auth_headers)
    assert resp.status_code == 200
    times = [s['time'] for s in resp.json()]
    assert '08:30' in times
    disabled = [s for s in resp.json() if not s['enabled']]
    assert len(disabled) == 1


def test_update_schedule_unauthenticated(client, test_user, auth_headers):
    get_resp = client.get('/api/schedule', headers=auth_headers)
    slots = get_resp.json()

    resp = client.put('/api/schedule', json={'slots': slots})
    assert resp.status_code == 403
