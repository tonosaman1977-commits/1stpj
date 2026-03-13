import os

from cryptography.fernet import Fernet

_FERNET_KEY = os.getenv('FERNET_KEY')
if not _FERNET_KEY:
    raise RuntimeError('FERNET_KEY environment variable is required')

_fernet = Fernet(_FERNET_KEY.encode())


def encrypt_token(token: str) -> str:
    """トークンを暗号化して文字列で返す。"""
    return _fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """暗号化されたトークンを復号して返す。"""
    return _fernet.decrypt(encrypted.encode()).decode()
