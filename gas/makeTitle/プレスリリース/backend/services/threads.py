import httpx

THREADS_BASE_URL = 'https://graph.threads.net/v1.0'
_THREADS_REFRESH_URL = 'https://graph.threads.net/refresh_access_token'


def post_to_threads(content: str, access_token: str, sns_user_id: str) -> str:
    """Threadsに投稿し、投稿IDを返す。"""
    # Step 1: メディアコンテナ作成
    create_resp = httpx.post(
        f'{THREADS_BASE_URL}/{sns_user_id}/threads',
        params={
            'media_type': 'TEXT',
            'text': content,
            'access_token': access_token,
        },
        timeout=30,
    )
    create_resp.raise_for_status()
    container_id = create_resp.json()['id']

    # Step 2: 公開
    publish_resp = httpx.post(
        f'{THREADS_BASE_URL}/{sns_user_id}/threads_publish',
        params={
            'creation_id': container_id,
            'access_token': access_token,
        },
        timeout=30,
    )
    publish_resp.raise_for_status()
    return publish_resp.json()['id']


def refresh_threads_token(access_token: str) -> dict:
    """Threadsの長期アクセストークンをリフレッシュする。

    Returns:
        {'access_token': str, 'expires_in': int}
    """
    resp = httpx.get(
        _THREADS_REFRESH_URL,
        params={
            'grant_type': 'th_refresh_token',
            'access_token': access_token,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()
