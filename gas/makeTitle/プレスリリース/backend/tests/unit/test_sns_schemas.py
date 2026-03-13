from routers.sns import SnsStatusResponse


def test_sns_status_not_connected():
    resp = SnsStatusResponse(
        connected=False,
        platform='threads',
        sns_user_id=None,
        token_expires_at=None,
        is_expired=False,
    )
    assert resp.connected is False
    assert resp.platform == 'threads'
    assert resp.sns_user_id is None
    assert resp.token_expires_at is None
    assert resp.is_expired is False


def test_sns_status_connected():
    resp = SnsStatusResponse(
        connected=True,
        platform='threads',
        sns_user_id='12345678',
        token_expires_at='2026-05-01T00:00:00+00:00',
        is_expired=False,
    )
    assert resp.connected is True
    assert resp.sns_user_id == '12345678'
    assert resp.is_expired is False


def test_sns_status_expired():
    resp = SnsStatusResponse(
        connected=True,
        platform='threads',
        sns_user_id='12345678',
        token_expires_at='2026-01-01T00:00:00+00:00',
        is_expired=True,
    )
    assert resp.is_expired is True
