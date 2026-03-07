/**
 * SummaryService.gs - 研究要約生成
 */

/**
 * 研究概要テキストから3段階の要約を生成する
 * @param {string} text
 * @returns {{ thirtySeconds: string, threeMinutes: string, summary: string }}
 */
function generateSummaries(text) {
  if (!text || text.length < 10) throw new Error('研究概要は10文字以上入力してください。');
  if (text.length > 20000) throw new Error('研究概要は20,000文字以内で入力してください。');

  var prompt = '以下の研究概要を読み、3段階の説明を生成してください。\n\n'
    + '【研究概要】\n' + text + '\n\n'
    + '【生成ルール】\n'
    + '共通禁止: 元研究内容にない事実の追加・誇張表現・効果の断定\n\n'
    + 'セクション別:\n'
    + '- thirtySeconds（30秒説明）: 研究の核心を一文または短い段落で・80〜120文字\n'
    + '- threeMinutes（3分説明）: 背景・内容・意義を一般向けに簡潔に・200〜350文字\n'
    + '- summary（研究要約）: 背景・方法・意義を構造的に整理・400〜600文字\n\n'
    + 'JSON形式で返してください。';

  return callGemini_({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          thirtySeconds: { type: 'STRING', description: '30秒説明' },
          threeMinutes:  { type: 'STRING', description: '3分説明' },
          summary:       { type: 'STRING', description: '研究要約' }
        },
        required: ['thirtySeconds', 'threeMinutes', 'summary']
      }
    }
  });
}
