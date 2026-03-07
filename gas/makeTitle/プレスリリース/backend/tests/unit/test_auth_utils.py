import auth as auth_utils


def test_hash_password_returns_hash():
    hashed = auth_utils.hash_password('mypassword')
    assert hashed != 'mypassword'
    assert len(hashed) > 0


def test_verify_password_correct():
    hashed = auth_utils.hash_password('mypassword')
    assert auth_utils.verify_password('mypassword', hashed) is True


def test_verify_password_wrong():
    hashed = auth_utils.hash_password('mypassword')
    assert auth_utils.verify_password('wrongpassword', hashed) is False


def test_create_access_token_returns_string():
    token = auth_utils.create_access_token('user-id-123')
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_token_valid():
    token = auth_utils.create_access_token('user-id-123')
    assert auth_utils.decode_token(token) == 'user-id-123'


def test_decode_token_invalid():
    assert auth_utils.decode_token('invalid.token.here') is None


def test_decode_token_tampered():
    token = auth_utils.create_access_token('user-id-123')
    tampered = token[:-5] + 'xxxxx'
    assert auth_utils.decode_token(tampered) is None
