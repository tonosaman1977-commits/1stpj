/**
 * TitleService.gs - 研究タイトル生成
 */

/**
 * 研究概要テキストから3カテゴリ×5案のタイトルを生成する
 * @param {string} text
 * @returns {{ academic: string[], general: string[], sns: string[] }}
 */
function generateTitles(text) {
  if (!text || text.length < 10) throw new Error('研究概要は10文字以上入力してください。');
  if (text.length > 20000) throw new Error('研究概要は20,000文字以内で入力してください。');

  var prompt = '以下の研究概要に基づき、3カテゴリ×各5案の日本語タイトルを生成してください。\n\n'
    + '【研究概要】\n' + text + '\n\n'
    + '【生成ルール】\n'
    + '共通禁止: 元研究内容にない事実の追加・誇張表現・効果の断定\n\n'
    + 'カテゴリ別:\n'
    + '- academic（学術向け）: 客観・簡潔、20〜50文字、論文タイトル形式\n'
    + '- general（一般向け）: 分かりやすい・やや説明的、20〜40文字、専門用語を減らす\n'
    + '- sns（SNS向け）: 短い・フック重視、15〜30文字、興味を引く\n\n'
    + 'JSON形式で各カテゴリ5案ずつ返してください。';

  return callGemini_({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          academic: { type: 'ARRAY', items: { type: 'STRING' }, description: '学術向けタイトル5案' },
          general:  { type: 'ARRAY', items: { type: 'STRING' }, description: '一般向けタイトル5案' },
          sns:      { type: 'ARRAY', items: { type: 'STRING' }, description: 'SNS向けタイトル5案' }
        },
        required: ['academic', 'general', 'sns']
      }
    }
  });
}
