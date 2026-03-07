import os

import httpx

THREADS_ACCESS_TOKEN = os.getenv('THREADS_ACCESS_TOKEN', '')
THREADS_USER_ID = os.getenv('THREADS_USER_ID', '')
THREADS_BASE_URL = 'https://graph.threads.net/v1.0'


def post_to_threads(content: str) -> str:
    """Threadsに投稿し、投稿IDを返す。"""
    if not THREADS_ACCESS_TOKEN or not THREADS_USER_ID:
        raise ValueError('Threads API認証情報が設定されていません')

    # Step 1: メディアコンテナ作成
    create_resp = httpx.post(
        f'{THREADS_BASE_URL}/{THREADS_USER_ID}/threads',
        params={
            'media_type': 'TEXT',
            'text': content,
            'access_token': THREADS_ACCESS_TOKEN,
        },
        timeout=30,
    )
    create_resp.raise_for_status()
    container_id = create_resp.json()['id']

    # Step 2: 公開
    publish_resp = httpx.post(
        f'{THREADS_BASE_URL}/{THREADS_USER_ID}/threads_publish',
        params={
            'creation_id': container_id,
            'access_token': THREADS_ACCESS_TOKEN,
        },
        timeout=30,
    )
    publish_resp.raise_for_status()
    return publish_resp.json()['id']
