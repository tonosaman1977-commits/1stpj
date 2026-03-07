/**
 * PressReleaseService.gs - プレスリリース生成
 */

var PRESS_MIN_ = 50;
var PRESS_MAX_ = 20000;

/**
 * プレスリリース6セクションを生成する
 * @param {object} params - { researchText, organizationName, researcherName, targetAudience, keywords, constraints }
 * @returns {{ titles: string[], lead: string, background: string, overview: string, significance: string, notes: string|null }}
 */
function generatePressRelease(params) {
  if (!params || typeof params.researchText !== 'string') throw new Error('研究概要テキストが入力されていません。');
  var len = params.researchText.trim().length;
  if (len < PRESS_MIN_) throw new Error('研究概要は' + PRESS_MIN_ + '字以上入力してください。（現在: ' + len + '字）');
  if (len > PRESS_MAX_) throw new Error('研究概要は' + PRESS_MAX_ + '字以内で入力してください。（現在: ' + len + '字）');

  return callGemini_({
    contents: [{ parts: [{ text: pressBuildPrompt_(params) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          titles:       { type: 'ARRAY', items: { type: 'STRING' } },
          lead:         { type: 'STRING' },
          background:   { type: 'STRING' },
          overview:     { type: 'STRING' },
          significance: { type: 'STRING' },
          notes:        { type: 'STRING', nullable: true }
        },
        required: ['titles', 'lead', 'background', 'overview', 'significance']
      }
    }
  });
}

/**
 * @param {object} params
 * @returns {string}
 */
function pressBuildPrompt_(params) {
  var text = params.researchText.trim();
  var prompt = '以下の研究概要に基づき、プレスリリース用の6セクションを日本語で生成してください。\n\n'
    + '【研究概要】\n' + text + '\n\n';

  if (params.organizationName) {
    prompt += '【研究機関名】\n' + params.organizationName + '\n'
      + '※ タイトル・リード文に「' + params.organizationName + '」として反映してください。\n\n';
  }
  if (params.researcherName) {
    prompt += '【研究者名】\n' + params.researcherName + '\n'
      + '※ リード文末尾に付記してください。\n\n';
  }
  if (params.targetAudience) {
    prompt += '【想定読者】\n' + params.targetAudience + '\n'
      + '※ 語彙レベル・説明の詳細度をこの読者に合わせてください。\n\n';
  }
  if (params.keywords) {
    prompt += '【含めたいキーワード】\n' + params.keywords + '\n'
      + '※ 各セクションに自然な形で含めてください。\n\n';
  }

  prompt += '【生成ルール】\n'
    + '共通禁止: 元研究内容にない事実の追加・誇張表現・効果・成果の断定\n\n'
    + 'セクション別:\n'
    + '- titles: 3案・各25〜50字・一般にも伝わる表現・煽らない\n'
    + '- lead: 100〜180字・冒頭だけで研究概要が分かる内容\n'
    + '- background: 150〜300字・なぜ必要か・従来課題・社会的背景\n'
    + '- overview: 200〜400字・何を・どう研究したか・一般読者向け表現\n'
    + '- significance: 120〜250字・「期待される」「可能性がある」で表現・断定しない\n'
    + '- notes: 検証段階・実用化保証なし等の注意書きが必要な場合のみ・不要時はnull\n\n';

  if (params.constraints) {
    prompt += '【禁止事項・注意事項】\n' + params.constraints + '\n\n';
  }

  prompt += 'JSON形式で返してください。';
  return prompt;
}
