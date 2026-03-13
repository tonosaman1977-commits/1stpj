import os

# テスト環境フラグ（schedulerをスキップ・SQLiteをテスト用DBに向ける）
os.environ['TESTING'] = 'true'
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ.setdefault('FERNET_KEY', 'THX5QkII13ZkNDrGPAF2K5V0lYrbowRwj5hwgMG69CY=')

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import auth as auth_utils
import models
from database import Base, engine, get_db
from main import app

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(setup_db):
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    user = models.User(
        id='test-user-id',
        email='test@example.com',
        name='テストユーザー',
        password_hash=auth_utils.hash_password('password123'),
        role='user',
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_token(test_user):
    return auth_utils.create_access_token(test_user.id)


@pytest.fixture
def auth_headers(auth_token):
    return {'Authorization': f'Bearer {auth_token}'}
