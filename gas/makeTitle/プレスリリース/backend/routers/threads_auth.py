import logging
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import auth as auth_utils
import crypto
import models
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/auth/threads', tags=['threads-auth'])

_APP_ID = os.getenv('THREADS_APP_ID', '')
_APP_SECRET = os.getenv('THREADS_APP_SECRET', '')
_REDIRECT_URI = os.getenv('THREADS_REDIRECT_URI', '')
_THREADS_AUTH_URL = 'https://threads.net/oauth/authorize'
_THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token'
_THREADS_LONG_TOKEN_URL = 'https://graph.threads.net/access_token'
_TOKEN_TTL_DAYS = 60


class AuthorizeUrlResponse(BaseModel):
    url: str


@router.get('/authorize-url', response_model=AuthorizeUrlResponse)
def authorize_url(current_user: models.User = Depends(auth_utils.get_current_user)):
    """Threads OAuthの認可URLをJSONで返す（フロントエンド用）。"""
    if not _APP_ID or not _REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Threads OAuth設定が未完了です',
        )
    params = {
        'client_id': _APP_ID,
        'redirect_uri': _REDIRECT_URI,
        'scope': 'threads_basic,threads_content_publish',
        'response_type': 'code',
        'state': current_user.id,
    }
    url = f'{_THREADS_AUTH_URL}?{urlencode(params)}'
    logger.info('OAuth authorize-url: user_id=%s', current_user.id)
    return AuthorizeUrlResponse(url=url)


@router.get('/authorize')
def authorize(current_user: models.User = Depends(auth_utils.get_current_user)):
    """Threads OAuthの認可URLへリダイレクトする。"""
    if not _APP_ID or not _REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Threads OAuth設定が未完了です',
        )
    params = {
        'client_id': _APP_ID,
        'redirect_uri': _REDIRECT_URI,
        'scope': 'threads_basic,threads_content_publish',
        'response_type': 'code',
        'state': current_user.id,
    }
    url = f'{_THREADS_AUTH_URL}?{urlencode(params)}'
    logger.info('OAuth authorize redirect: user_id=%s', current_user.id)
    return RedirectResponse(url=url, status_code=302)


@router.get('/callback')
def callback(code: str, state: str, db: Session = Depends(get_db)):
    """Threads OAuthコールバック: コードをトークンに交換してDBに保存する。"""
    if not _APP_ID or not _APP_SECRET or not _REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Threads OAuth設定が未完了です',
        )

    user = db.query(models.User).filter(models.User.id == state).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='不正なstateパラメータです')

    # 短期トークン取得
    short_resp = httpx.post(
        _THREADS_TOKEN_URL,
        data={
            'client_id': _APP_ID,
            'client_secret': _APP_SECRET,
            'grant_type': 'authorization_code',
            'redirect_uri': _REDIRECT_URI,
            'code': code,
        },
        timeout=30,
    )
    if short_resp.status_code != 200:
        logger.error('短期トークン取得失敗: %s', short_resp.text)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='Threadsトークン取得に失敗しました')
    short_data = short_resp.json()

    # 長期トークンに交換（60日有効）
    long_resp = httpx.get(
        _THREADS_LONG_TOKEN_URL,
        params={
            'grant_type': 'th_exchange_token',
            'client_secret': _APP_SECRET,
            'access_token': short_data['access_token'],
        },
        timeout=30,
    )
    if long_resp.status_code != 200:
        logger.error('長期トークン取得失敗: %s', long_resp.text)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='長期トークン取得に失敗しました')
    long_data = long_resp.json()

    token_expires_at = datetime.now(timezone.utc) + timedelta(days=_TOKEN_TTL_DAYS)
    encrypted = crypto.encrypt_token(long_data['access_token'])
    sns_user_id = str(short_data.get('user_id', ''))

    # 既存レコードがあればupsert
    conn = db.query(models.SnsConnection).filter(
        models.SnsConnection.user_id == user.id,
        models.SnsConnection.platform == 'threads',
    ).first()

    if conn:
        conn.access_token_encrypted = encrypted
        conn.token_expires_at = token_expires_at
        conn.is_expired = False
        conn.sns_user_id = sns_user_id
        conn.updated_at = datetime.now(timezone.utc)
    else:
        conn = models.SnsConnection(
            user_id=user.id,
            platform='threads',
            sns_user_id=sns_user_id,
            access_token_encrypted=encrypted,
            token_expires_at=token_expires_at,
            is_expired=False,
        )
        db.add(conn)

    db.commit()
    logger.info('Threads OAuth完了: user_id=%s', user.id)

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    return RedirectResponse(url=f'{frontend_url}/dashboard?sns_connected=1', status_code=302)
