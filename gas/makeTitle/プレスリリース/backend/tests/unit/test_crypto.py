import os

import pytest

os.environ.setdefault('FERNET_KEY', 'THX5QkII13ZkNDrGPAF2K5V0lYrbowRwj5hwgMG69CY=')

import crypto


def test_encrypt_returns_string():
    result = crypto.encrypt_token('my-token-123')
    assert isinstance(result, str)
    assert result != 'my-token-123'


def test_decrypt_roundtrip():
    original = 'access_token_value_abc'
    encrypted = crypto.encrypt_token(original)
    decrypted = crypto.decrypt_token(encrypted)
    assert decrypted == original


def test_different_tokens_produce_different_ciphertext():
    enc1 = crypto.encrypt_token('token-a')
    enc2 = crypto.encrypt_token('token-b')
    assert enc1 != enc2


def test_decrypt_invalid_raises():
    from cryptography.fernet import InvalidToken
    with pytest.raises((InvalidToken, Exception)):
        crypto.decrypt_token('not-valid-ciphertext')


def test_encrypt_empty_string():
    enc = crypto.encrypt_token('')
    assert crypto.decrypt_token(enc) == ''
