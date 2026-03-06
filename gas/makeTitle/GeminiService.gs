/**
 * GeminiService.gs - Gemini API呼び出し（3カテゴリ一括生成）
 */

/**
 * Gemini APIを呼び出して3カテゴリ×5案のタイトルを生成する
 * @param {string} text - 研究概要テキスト
 * @returns {{ academic: string[], general: string[], sns: string[] }}
 */
function callGeminiAPI(text) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティを確認してください。');
  }

  var prompt = buildPrompt(text);
  var payload = buildPayload(prompt);

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

  return parseGeminiResponse(responseText);
}

/**
 * プロンプトを構築する
 * @param {string} text - 研究概要テキスト
 * @returns {string}
 */
function buildPrompt(text) {
  return '以下の研究概要に基づき、3カテゴリ×各5案の日本語タイトルを生成してください。\n\n'
    + '【研究概要】\n'
    + text + '\n\n'
    + '【生成ルール】\n'
    + '共通禁止事項:\n'
    + '- 元研究内容にない事実の追加\n'
    + '- 誇張表現\n'
    + '- 効果の断定\n\n'
    + 'カテゴリ別ルール:\n'
    + '- academic（学術向け）: 客観・簡潔、20〜50文字、論文タイトル形式\n'
    + '- general（一般向け）: 分かりやすい・やや説明的、20〜40文字、専門用語を減らす\n'
    + '- sns（SNS向け）: 短い・フック重視、15〜30文字、興味を引く\n\n'
    + 'JSON形式で各カテゴリ5案ずつ返してください。';
}

/**
 * Gemini APIリクエストペイロードを構築する
 * @param {string} prompt
 * @returns {object}
 */
function buildPayload(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          academic: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '学術向けタイトル5案'
          },
          general: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '一般向けタイトル5案'
          },
          sns: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'SNS向けタイトル5案'
          }
        },
        required: ['academic', 'general', 'sns']
      }
    }
  };
}

/**
 * Gemini APIレスポンスをパースして結果を返す
 * @param {string} responseText
 * @returns {{ academic: string[], general: string[], sns: string[] }}
 */
function parseGeminiResponse(responseText) {
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

  var titles;
  try {
    titles = JSON.parse(content);
  } catch (e) {
    Logger.log('タイトルJSON解析失敗: ' + content);
    throw new Error('タイトルデータの解析に失敗しました: ' + content);
  }

  if (!titles.academic || !titles.general || !titles.sns) {
    throw new Error('タイトルデータが不完全です: ' + JSON.stringify(titles));
  }

  return titles;
}
