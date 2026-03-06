function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'health') {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('研究発信変換エンジン')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processResearch(payload) {
  try {
    var sourceText = payload.sourceText || '';
    var pdfBase64  = payload.pdfBase64  || null;
    var options    = payload.options    || {};

    if (!pdfBase64 && sourceText.length < 10) {
      throw new Error('入力テキストが短すぎます（10文字以上必要）');
    }
    if (!pdfBase64 && sourceText.length > 50000) {
      throw new Error('テキストは50,000文字以内にしてください');
    }

    var researchCard = buildResearchCard(sourceText, pdfBase64, options);
    var outputs      = assembleOutputs(researchCard);

    return { success: true, data: outputs };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
