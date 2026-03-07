/**
 * MultiLangService.gs - 多言語研究説明生成
 */

var MULTI_LANG_CONFIG_ = {
  chinese:    { label: '中国語（簡体字）', description: '中国語（簡体字）で200〜350文字相当の説明。自然な中国語・専門用語は必要に応じて説明' },
  korean:     { label: '韓国語',           description: '韓国語で200〜350文字相当の説明。自然な韓国語' },
  vietnamese: { label: 'ベトナム語',       description: 'ベトナム語で200〜350文字相当の説明。自然なベトナム語' },
  spanish:    { label: 'スペイン語',       description: 'スペイン語で200〜350文字相当の説明。自然なスペイン語' },
  french:     { label: 'フランス語',       description: 'フランス語で200〜350文字相当の説明。自然なフランス語' }
};

/**
 * 研究概要テキストから多言語説明を生成する
 * @param {string} text
 * @param {string[]} selectedLanguages - 追加生成する言語コードの配列
 * @returns {object}
 */
function generateExplanations(text, selectedLanguages) {
  if (!text || text.length < 20) throw new Error('研究概要は20文字以上入力してください。');
  if (text.length > 20000) throw new Error('研究概要は20,000文字以内で入力してください。');
  var langs = Array.isArray(selectedLanguages) ? selectedLanguages : [];
  return callGemini_(multiLangBuildPayload_(text, langs));
}

/**
 * @param {string} text
 * @param {string[]} selectedLanguages
 * @returns {object}
 */
function multiLangBuildPayload_(text, selectedLanguages) {
  var additionalLangs = selectedLanguages.map(function(lang) {
    var cfg = MULTI_LANG_CONFIG_[lang];
    return '- ' + lang + ': ' + cfg.description;
  }).join('\n');

  var prompt = '以下の研究概要を読み、指定の形式で説明文を生成してください。\n\n'
    + '【研究概要】\n' + text + '\n\n'
    + '【生成ルール（共通禁止事項）】\n'
    + '- 元の研究内容にない事実の追加禁止\n'
    + '- 効果の断定禁止\n'
    + '- 誇張表現禁止\n\n'
    + '【各フィールドの仕様】\n'
    + '- easy_japanese: やさしい日本語、200〜350文字、1文を短く・難しい言葉を言い換える・中学生レベル\n'
    + '- english: 英語説明、120〜200 words、シンプルな文構造・読みやすさ優先\n'
    + '- for_international_students: 留学生向け説明（日本語）、200〜350文字、研究分野を明確に・背景説明あり\n'
    + (additionalLangs ? additionalLangs + '\n' : '')
    + '\n必ず指定フィールドをすべて含むJSONで返してください。';

  var properties = {
    easy_japanese:              { type: 'STRING', description: 'やさしい日本語説明' },
    english:                    { type: 'STRING', description: '英語説明' },
    for_international_students: { type: 'STRING', description: '留学生向け説明' }
  };
  selectedLanguages.forEach(function(lang) {
    properties[lang] = { type: 'STRING', description: MULTI_LANG_CONFIG_[lang].label + '説明' };
  });

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: properties,
        required: ['easy_japanese', 'english', 'for_international_students'].concat(selectedLanguages)
      }
    }
  };
}
