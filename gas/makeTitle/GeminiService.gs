/**
 * GeminiService.gs - Gemini API呼び出し（3カテゴリ一括生成）
 */

/**
 * Gemini APIを呼び出して3カテゴリ×5案のタイトルを生成する
 * @param {string} text - 研究概要テキスト
 * @param {Array} references - バズりリファレンス一覧（省略可）
 * @returns {{ academic: string[], general: string[], sns: string[] }}
 */
function callGeminiAPI(text, references) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティを確認してください。');
  }

  var prompt = buildPrompt(text, references);
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
 * プロンプトを構築する（リファレンスがあれば模倣と合成モード）
 * @param {string} text - 研究概要テキスト
 * @param {Array} references - バズりリファレンス一覧（省略可）
 * @returns {string}
 */
function buildPrompt(text, references) {
  var validRefs = (references || []).filter(function (r) { return r && r.content; });
  if (validRefs.length > 0) {
    return buildReferencePrompt(text, validRefs);
  }
  return buildDefaultPrompt(text);
}

/**
 * 模倣と合成モードのプロンプトを構築する
 * @param {string} text
 * @param {Array<{label: string, content: string}>} validRefs
 * @returns {string}
 */
function buildReferencePrompt(text, validRefs) {
  var refBlock = validRefs.map(function (r, i) {
    return '【参考投稿' + (i + 1) + ': ' + r.label + '】\n' + r.content;
  }).join('\n\n');

  return '以下の研究概要に基づき、3カテゴリ×各5案の日本語コンテンツを生成してください。\n\n'
    + '【研究概要】\n'
    + text + '\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n'
    + '【模倣と合成モード: ' + validRefs.length + '件のリファレンスを使用】\n'
    + '以下のバズり投稿をリファレンスとして読み込み、構造・熱量・語気をトレースしてください。\n\n'
    + refBlock + '\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n'
    + '【Step 1: リファレンスの構造解析】\n'
    + '上記の参考投稿から以下の要素を抽出し、SNS案の生成に活用してください:\n'
    + '  - フックのパターン（問いかけ型 / 数字型 / 逆説型 / 衝撃事実型 など）\n'
    + '  - ベネフィットの届け方（Before/After型 / 列挙型 / ストーリー型 など）\n'
    + '  - CTAのスタイル（保存促進 / シェア促進 / コメント促進 など）\n'
    + '  - 文体・熱量・語気（テンション・句読点リズム・絵文字の密度と配置）\n\n'
    + '【Step 2: 模倣と合成】\n'
    + 'リファレンスの構造・熱量・語気をトレースしつつ、研究概要固有の数値・発見・意外な結論を最大限活用してください。\n'
    + '目標: 「リファレンスのコピー」ではなく「構造の模倣 × 内容の完全な独自性」の実現。\n\n'
    + '【生成ルール】\n'
    + '共通禁止事項:\n'
    + '  - 元研究内容にない事実の追加\n'
    + '  - 誇張表現・効果の断定\n'
    + '  - 「〜ことがわかりました」「〜が重要です」などの汎用フレーズの多用\n\n'
    + 'カテゴリ別ルール:\n'
    + '  academic（学術向けタイトル）: 客観・簡潔、20〜50文字、論文タイトル形式\n'
    + '  general（一般向けタイトル） : わかりやすく説明的、20〜40文字、専門用語を減らす\n'
    + '  sns（SNS投稿文）            :\n'
    + '    - リファレンスの構造をトレースした構成（フック→ベネフィット→CTA）\n'
    + '    - 各要素の区切りには改行を入れること（JSONの\\nで表現）\n'
    + '    - 文字数: 全体で100〜200文字程度\n'
    + '    - 絵文字: リファレンスの密度・配置パターンを参考に効果的に配置\n'
    + '    - 必須条件: 読者が「保存したくなる」実益のある具体的情報を含める\n\n'
    + '【Step 3: 自己検閲】\n'
    + 'sns案を生成したあと、リファレンスの熱量・具体性に比べて見劣りする投稿は書き直してから出力してください。\n\n'
    + 'JSON形式で各カテゴリ5案ずつ返してください。';
}

/**
 * デフォルトプロンプトを構築する（リファレンスなし）
 * @param {string} text
 * @returns {string}
 */
function buildDefaultPrompt(text) {
  return '以下の研究概要に基づき、3カテゴリ×各5案の日本語コンテンツを生成してください。\n\n'
    + '【研究概要】\n'
    + text + '\n\n'
    + '【Step 1: バズ構造の参照】\n'
    + '科学・研究系SNSで高い反響を得た投稿に共通する3要素を踏まえて生成してください。\n'
    + '  フック    : 冒頭で「えっ？」「知らなかった」と思わせる意外な事実・問いかけ\n'
    + '  ベネフィット: 「これを知ると○○が変わる」という読者への具体的なメリット\n'
    + '  CTA       : 「保存して後で読んで」「○○な人に届けて」など行動を促す一言\n\n'
    + '【Step 2: 独自性の確保】\n'
    + 'sns案を作る前に自問してください: 「Googleで検索すれば誰でも書ける内容ではないか？」\n'
    + '研究固有の数値・発見・意外な結論を最大限活用し、汎用フレーズを排除してください。\n\n'
    + '【生成ルール】\n'
    + '共通禁止事項:\n'
    + '  - 元研究内容にない事実の追加\n'
    + '  - 誇張表現・効果の断定\n'
    + '  - 「〜ことがわかりました」「〜が重要です」などの汎用フレーズの多用\n\n'
    + 'カテゴリ別ルール:\n'
    + '  academic（学術向けタイトル）: 客観・簡潔、20〜50文字、論文タイトル形式\n'
    + '  general（一般向けタイトル） : わかりやすく説明的、20〜40文字、専門用語を減らす\n'
    + '  sns（SNS投稿文）            :\n'
    + '    - 構成: フック（1行）→ 空白行 → ベネフィット（2〜3行）→ 空白行 → CTA（1行）\n'
    + '    - 各要素の区切りには改行を入れること（JSONの\\nで表現）\n'
    + '    - 文字数: 全体で100〜200文字程度\n'
    + '    - 絵文字: 1投稿につき3〜5個、内容に沿ったものを効果的に配置\n'
    + '    - 必須条件: 読者が「保存したくなる」実益のある具体的情報を含める\n\n'
    + '【Step 3: 自己検閲】\n'
    + 'sns案を生成したあと、「一般的すぎる・ありきたり」と判断した投稿は\n'
    + '具体的なデータや意外な視点を加えて書き直してから出力してください。\n\n'
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
