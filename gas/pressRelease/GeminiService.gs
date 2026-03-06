/**
 * GeminiService.gs - Gemini API呼び出し（6セクション一括生成）
 */

/**
 * Gemini APIを呼び出して6セクションのプレスリリースを生成する
 * @param {object} params - { researchText, organizationName, researcherName, targetAudience, keywords, constraints }
 * @returns {{ titles: string[], lead: string, background: string, overview: string, significance: string, notes: string|null }}
 */
function callGeminiAPI(params) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティを確認してください。');
  }

  var prompt = buildPrompt(params);
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
 * @param {object} params
 * @returns {string}
 */
function buildPrompt(params) {
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
    + '共通禁止事項:\n'
    + '- 元研究内容にない事実の追加\n'
    + '- 誇張表現\n'
    + '- 効果・成果の断定\n\n'
    + 'セクション別ルール:\n'
    + '- titles: 3案・各25〜50字・一般にも伝わる表現・煽らない\n'
    + '- lead: 100〜180字・冒頭だけで研究概要が分かる内容\n'
    + '- background: 150〜300字・なぜ必要か・従来課題・社会的背景\n'
    + '- overview: 200〜400字・何を・どう研究したか・一般読者向け表現\n'
    + '- significance: 120〜250字・「期待される」「可能性がある」で表現・断定しない\n'
    + '- notes: 検証段階・実用化保証なし等の注意書きが必要な場合のみ記載・不要時はnull\n\n';

  if (params.constraints) {
    prompt += '【禁止事項・注意事項】\n' + params.constraints + '\n\n';
  }

  prompt += 'JSON形式で返してください。';
  return prompt;
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
          titles: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          },
          lead: { type: 'STRING' },
          background: { type: 'STRING' },
          overview: { type: 'STRING' },
          significance: { type: 'STRING' },
          notes: { type: 'STRING', nullable: true }
        },
        required: ['titles', 'lead', 'background', 'overview', 'significance']
      }
    }
  };
}

/**
 * Gemini APIレスポンスをパースする
 * @param {string} responseText
 * @returns {{ titles: string[], lead: string, background: string, overview: string, significance: string, notes: string|null }}
 */
function parseGeminiResponse(responseText) {
  var parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    Logger.log('レスポンスJSONパース失敗: ' + responseText);
    throw new Error('APIレスポンスのパースに失敗しました。ログを確認してください。');
  }

  var content = parsed.candidates && parsed.candidates[0]
    && parsed.candidates[0].content && parsed.candidates[0].content.parts
    && parsed.candidates[0].content.parts[0]
    && parsed.candidates[0].content.parts[0].text;

  if (!content) {
    Logger.log('予期しないレスポンス構造: ' + responseText);
    throw new Error('APIレスポンスの構造が想定外です。ログを確認してください。');
  }

  var result;
  try {
    result = JSON.parse(content);
  } catch (e) {
    Logger.log('コンテンツJSONパース失敗: ' + content);
    throw new Error('生成結果のパースに失敗しました。ログを確認してください。');
  }

  return {
    titles: result.titles || [],
    lead: result.lead || '',
    background: result.background || '',
    overview: result.overview || '',
    significance: result.significance || '',
    notes: result.notes || null
  };
}
