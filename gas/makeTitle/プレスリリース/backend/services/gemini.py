import os

import httpx

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_URL = (
    'https://generativelanguage.googleapis.com/v1beta/models/'
    'gemini-2.5-flash-lite:generateContent'
)


def generate_post_content(
    theme_name: str,
    theme_description: str,
    references: list[dict] | None = None,
) -> str:
    """Gemini APIでThreads投稿文を生成する。
    references が渡された場合は模倣と合成モードで生成する。
    """
    if not GEMINI_API_KEY:
        raise ValueError('GEMINI_API_KEY が設定されていません')

    valid_refs = [r for r in (references or []) if r.get('content')]

    if valid_refs:
        ref_block = '\n\n'.join(
            f'【参考投稿{i+1}: {r.get("label", "")}】\n{r["content"]}'
            for i, r in enumerate(valid_refs)
        )
        prompt = (
            f'Threadsへの投稿文を1つ生成してください。\n\n'
            f'テーマ名: {theme_name}\n'
            f'テーマ説明: {theme_description}\n\n'
            f'━━━━━━━━━━━━━━━━━━━━\n'
            f'【模倣と合成モード: {len(valid_refs)}件のリファレンスを使用】\n'
            f'以下のバズりThreads投稿をリファレンスとして読み込み、'
            f'構造・熱量・語気をトレースしてください。\n\n'
            f'{ref_block}\n\n'
            f'━━━━━━━━━━━━━━━━━━━━\n'
            f'【Step 1: 構造解析】\n'
            f'上記から以下を抽出し活用してください:\n'
            f'- フックのパターン（問いかけ型/数字型/逆説型 など）\n'
            f'- ベネフィットの届け方\n'
            f'- CTAのスタイル\n'
            f'- 文体・熱量・絵文字の密度\n\n'
            f'【Step 2: 合成】\n'
            f'リファレンスの構造・語気をトレースしつつ、'
            f'テーマ固有の内容で完全に独自の投稿文を生成してください。\n\n'
            f'条件:\n'
            f'- 500文字以内\n'
            f'- 自然な日本語\n'
            f'- テーマ内容に忠実に（事実の追加・誇張・断定禁止）\n'
            f'- 投稿文のみ出力（説明文不要）'
        )
    else:
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
