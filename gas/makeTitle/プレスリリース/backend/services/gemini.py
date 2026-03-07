import os

import httpx

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_URL = (
    'https://generativelanguage.googleapis.com/v1beta/models/'
    'gemini-2.5-flash-lite:generateContent'
)


def generate_post_content(theme_name: str, theme_description: str) -> str:
    """Gemini APIでThreads投稿文を生成する。"""
    if not GEMINI_API_KEY:
        raise ValueError('GEMINI_API_KEY が設定されていません')

    prompt = (
        f'Threadsへの投稿文を1つ生成してください。\n\n'
        f'テーマ名: {theme_name}\n'
        f'テーマ説明: {theme_description}\n\n'
        f'条件:\n'
        f'- 500文字以内\n'
        f'- ハッシュタグを2〜3個含める\n'
        f'- 自然な日本語\n'
        f'- テーマ内容に忠実に（事実の追加・誇張・断定禁止）\n'
        f'- 投稿文のみ出力（説明文不要）'
    )

    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'responseMimeType': 'text/plain', 'maxOutputTokens': 500},
    }

    response = httpx.post(
        f'{GEMINI_URL}?key={GEMINI_API_KEY}', json=payload, timeout=30
    )
    response.raise_for_status()
    return response.json()['candidates'][0]['content']['parts'][0]['text'].strip()
