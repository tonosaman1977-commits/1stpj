var GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// ---- 内部基盤 ----

function callGemini_(systemPrompt, userParts, schema) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY が未設定です。スクリプトプロパティに登録してください。');

  var requestBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  };

  var response = UrlFetchApp.fetch(GEMINI_ENDPOINT + '?key=' + apiKey, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code !== 200) throw new Error('Gemini API エラー ' + code + ': ' + text);

  var result  = JSON.parse(text);
  var content = result.candidates[0].content.parts[0].text;
  try {
    return JSON.parse(content);
  } catch (e) {
    Logger.log('JSONパース失敗: ' + content);
    throw new Error('レスポンスのJSONパース失敗: ' + content.substring(0, 300));
  }
}

// ---- Step A: researchCard 生成 ----

function buildResearchCard(sourceText, pdfBase64, options) {
  var systemPrompt = [
    '役割: 大学研究の紹介文を、誇張せず、用途展開しやすい構造化要約(JSON)に変換する。',
    'ルール:',
    '- 不明な点は推測で断定しない（「可能性」「〜を目指す」などに逃がす）',
    '- 固有名詞・専門用語は保持しつつ言い換えも併記',
    '- JSONのみで返す（余計な文章禁止）'
  ].join('\n');

  var optText   = JSON.stringify(options);
  var userParts = pdfBase64
    ? [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: '上記PDFの研究内容を構造化してください。\n補足情報: ' + optText }
      ]
    : [{ text: '以下の研究紹介文を構造化してください。\n---\n' + sourceText + '\n---\n補足情報: ' + optText }];

  var schema = {
    type: 'object',
    properties: {
      topic:         { type: 'string' },
      problem:       { type: 'string' },
      approach:      { type: 'string' },
      novelty:       { type: 'string' },
      impact:        { type: 'string' },
      evidenceLevel: { type: 'string', enum: ['検証中', '査読済', '実装済'] },
      terms:    { type: 'array', items: { type: 'object',
                    properties: { word: { type: 'string' }, simpleWord: { type: 'string' } },
                    required: ['word', 'simpleWord'] } },
      keywords: { type: 'array', items: { type: 'string' } }
    },
    required: ['topic', 'problem', 'approach', 'novelty', 'impact', 'evidenceLevel', 'terms', 'keywords']
  };

  return callGemini_(systemPrompt, userParts, schema);
}

// ---- Step B: 3フォーマット + メタ 一括生成 ----

function assembleOutputs(researchCard) {
  var modeDescriptions = Object.keys(MODE_CONFIG).map(function(key) {
    var c = MODE_CONFIG[key];
    return key + ': トーン=' + c.tone + ' / 文字数=' + c.length +
           ' / 構成=' + c.structure + ' / 禁止=' + c.forbidden;
  }).join('\n');

  var systemPrompt = [
    '役割: 研究の構造化データから、複数フォーマットの読者向け文章と共通メタ情報を一括生成する。',
    'ルール:',
    '- 成果の断定禁止: 「効果がある」→「可能性がある」「目指す」',
    '- 固有名詞（研究室名・教授名・機関名）をそのまま保持',
    '- 医療・法律・安全に関わる内容はcautionsに注意書きを出力。なければcautionsは空文字',
    '- JSONのみで返す',
    '',
    '各modeの仕様:',
    modeDescriptions
  ].join('\n');

  var userParts = [{ text: '研究データ:\n' + JSON.stringify(researchCard) }];

  var schema = {
    type: 'object',
    properties: {
      title:    { type: 'string' },
      oneLiner: { type: 'string' },
      keyPoints: { type: 'array', items: { type: 'string' } },
      cautions:  { type: 'string' },
      tags:      { type: 'array', items: { type: 'string' } },
      web:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
      sns:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
      easy: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] }
    },
    required: ['title', 'oneLiner', 'keyPoints', 'cautions', 'tags', 'web', 'sns', 'easy']
  };

  var result = callGemini_(systemPrompt, userParts, schema);

  return {
    title:     result.title,
    oneLiner:  result.oneLiner,
    keyPoints: result.keyPoints  || [],
    cautions:  result.cautions   || null,
    tags:      result.tags       || [],
    web:       { body: result.web.body  },
    sns:       { body: result.sns.body  },
    easy:      { body: result.easy.body }
  };
}
