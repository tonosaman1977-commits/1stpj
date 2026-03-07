/**
 * ConversionService.gs - 研究発信変換エンジン
 */

var CONV_MODE_CONFIG_ = {
  web_ja_formal: {
    tone:      '大学公式ページ風、丁寧',
    length:    '400〜900字',
    structure: '導入→課題→アプローチ→意義',
    forbidden: '煽り・口語・過度な比喩'
  },
  sns_ja_hook: {
    tone:      '短く興味喚起、カジュアル',
    length:    '120〜220字 + CTA1行',
    structure: 'フック→要点1〜2→軽いCTA',
    forbidden: '固い説明・長い専門語'
  },
  easy_ja: {
    tone:      'やさしい日本語、短文',
    length:    '250〜500字',
    structure: '短文・専門語に言い換え注釈',
    forbidden: '難解な漢語・長文'
  }
};

/**
 * 研究テキスト／PDFを3フォーマットに変換する
 * @param {object} payload - { sourceText, pdfBase64, options }
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function processResearch(payload) {
  try {
    var sourceText = payload.sourceText || '';
    var pdfBase64  = payload.pdfBase64  || null;
    var options    = payload.options    || {};

    if (!pdfBase64 && sourceText.length < 10)    throw new Error('入力テキストが短すぎます（10文字以上必要）');
    if (!pdfBase64 && sourceText.length > 50000) throw new Error('テキストは50,000文字以内にしてください');

    var researchCard = convBuildResearchCard_(sourceText, pdfBase64, options);
    var outputs      = convAssembleOutputs_(researchCard);
    return { success: true, data: outputs };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * @param {string} sourceText
 * @param {string|null} pdfBase64
 * @param {object} options
 * @returns {object}
 */
function convBuildResearchCard_(sourceText, pdfBase64, options) {
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

  return callGemini_({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
  });
}

/**
 * @param {object} researchCard
 * @returns {object}
 */
function convAssembleOutputs_(researchCard) {
  var modeDescriptions = Object.keys(CONV_MODE_CONFIG_).map(function(key) {
    var c = CONV_MODE_CONFIG_[key];
    return key + ': トーン=' + c.tone + ' / 文字数=' + c.length
           + ' / 構成=' + c.structure + ' / 禁止=' + c.forbidden;
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

  var schema = {
    type: 'object',
    properties: {
      title:     { type: 'string' },
      oneLiner:  { type: 'string' },
      keyPoints: { type: 'array', items: { type: 'string' } },
      cautions:  { type: 'string' },
      tags:      { type: 'array', items: { type: 'string' } },
      web:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
      sns:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
      easy: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] }
    },
    required: ['title', 'oneLiner', 'keyPoints', 'cautions', 'tags', 'web', 'sns', 'easy']
  };

  var result = callGemini_({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: '研究データ:\n' + JSON.stringify(researchCard) }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
  });

  return {
    title:     result.title,
    oneLiner:  result.oneLiner,
    keyPoints: result.keyPoints || [],
    cautions:  result.cautions  || null,
    tags:      result.tags      || [],
    web:  { body: result.web.body  },
    sns:  { body: result.sns.body  },
    easy: { body: result.easy.body }
  };
}
