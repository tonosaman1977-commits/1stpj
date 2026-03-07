/**
 * GeminiService.gs - Gemini API呼び出し（固定3種＋選択言語を一括生成）
 */

var LANG_CONFIG = {
  chinese:    { label: '中国語（簡体字）', description: '中国語（簡体字）で200〜350文字相当の説明。自然な中国語・専門用語は必要に応じて説明' },
  korean:     { label: '韓国語',           description: '韓国語で200〜350文字相当の説明。自然な韓国語' },
  vietnamese: { label: 'ベトナム語',       description: 'ベトナム語で200〜350文字相当の説明。自然なベトナム語' },
  spanish:    { label: 'スペイン語',       description: 'スペイン語で200〜350文字相当の説明。自然なスペイン語' },
  french:     { label: 'フランス語',       description: 'フランス語で200〜350文字相当の説明。自然なフランス語' }
};

/**
 * Gemini APIを呼び出して多言語説明文を生成する
 * @param {string} text - 研究概要テキスト
 * @param {string[]} selectedLanguages - 追加言語コードの配列
 * @returns {object}
 */
function callGeminiAPI(text, selectedLanguages) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティを確認してください。');
  }

  var prompt = buildPrompt(text, selectedLanguages);
  var payload = buildPayload(prompt, selectedLanguages);

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey;
  var response = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (statusCode !== 200) {
    Logger.log('Gemini API エラー [' + statusCode + ']: ' + responseText);
    throw new Error('Gemini API エラー (HTTP ' + statusCode + '): ' + responseText);
  }

  return parseGeminiResponse(responseText, selectedLanguages);
}

/**
 * プロンプトを構築する
 * @param {string} text
 * @param {string[]} selectedLanguages
 * @returns {string}
 */
function buildPrompt(text, selectedLanguages) {
  var additionalLangs = selectedLanguages.map(function(lang) {
    var cfg = LANG_CONFIG[lang];
    return '- ' + lang + ': ' + cfg.description;
  }).join('\n');

  return '以下の研究概要を読み、指定の形式で説明文を生成してください。\n\n'
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
}

/**
 * Gemini APIリクエストペイロードを構築する（選択言語に応じて動的スキーマ）
 * @param {string} prompt
 * @param {string[]} selectedLanguages
 * @returns {object}
 */
function buildPayload(prompt, selectedLanguages) {
  var properties = {
    easy_japanese:              { type: 'STRING', description: 'やさしい日本語説明' },
    english:                    { type: 'STRING', description: '英語説明' },
    for_international_students: { type: 'STRING', description: '留学生向け説明' }
  };

  selectedLanguages.forEach(function(lang) {
    properties[lang] = { type: 'STRING', description: LANG_CONFIG[lang].label + '説明' };
  });

  var required = ['easy_japanese', 'english', 'for_international_students'].concat(selectedLanguages);

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: properties,
        required: required
      }
    }
  };
}

/**
 * Gemini APIレスポンスをパースして結果を返す
 * @param {string} responseText
 * @param {string[]} selectedLanguages
 * @returns {object}
 */
function parseGeminiResponse(responseText, selectedLanguages) {
  var parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    Logger.log('レスポンスJSON解析失敗: ' + responseText);
    throw new Error('APIレスポンスの解析に失敗しました: ' + responseText);
  }

  var candidates = parsed && parsed.candidates;
  var content = candidates && candidates[0] && candidates[0].content
    && candidates[0].content.parts && candidates[0].content.parts[0]
    && candidates[0].content.parts[0].text;

  if (!content) {
    Logger.log('candidates構造が想定外: ' + responseText);
    throw new Error('APIレスポンス構造が想定外です: ' + responseText);
  }

  var result;
  try {
    result = JSON.parse(content);
  } catch (e) {
    Logger.log('説明文JSON解析失敗: ' + content);
    throw new Error('説明文データの解析に失敗しました: ' + content);
  }

  if (!result.easy_japanese || !result.english || !result.for_international_students) {
    throw new Error('説明文データが不完全です: ' + JSON.stringify(result));
  }

  return result;
}
