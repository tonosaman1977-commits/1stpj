#!/usr/bin/env python3
"""開発用デモユーザーのシードスクリプト。"""
import os

from dotenv import load_dotenv

load_dotenv('.env.local')

import auth as auth_utils
import models
from database import Base, SessionLocal, engine

Base.metadata.create_all(bind=engine)

DEMO_USERS = [
    {'email': 'demo@example.com', 'password': 'demo123', 'name': 'デモユーザー'},
    {'email': 'admin@example.com', 'password': 'admin123', 'name': '管理者'},
]

db = SessionLocal()
try:
    for u in DEMO_USERS:
        existing = db.query(models.User).filter(models.User.email == u['email']).first()
        if not existing:
            user = models.User(
                email=u['email'],
                name=u['name'],
                password_hash=auth_utils.hash_password(u['password']),
                role='user',
            )
            db.add(user)
            print(f'Created: {u["email"]}')
        else:
            print(f'Already exists: {u["email"]}')
    db.commit()
finally:
    db.close()

print('Seeding complete.')
