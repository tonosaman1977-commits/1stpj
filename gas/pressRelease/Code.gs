/**
 * Code.gs - doGet エントリーポイント・generatePressRelease 関数
 */

var MIN_LENGTH = 50;
var MAX_LENGTH = 20000;

/**
 * WebApp エントリーポイント
 * @param {object} e - GAS イベントオブジェクト
 * @returns {HtmlOutput}
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var output = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('研究プレスリリース生成エンジン')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  output.addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  return output;
}

/**
 * プレスリリース生成（クライアントから呼び出し）
 * @param {object} params - { researchText, organizationName, researcherName, targetAudience, keywords, constraints }
 * @returns {{ titles: string[], lead: string, background: string, overview: string, significance: string, notes: string|null }}
 */
function generatePressRelease(params) {
  validateParams(params);
  return callGeminiAPI(params);
}

/**
 * 入力バリデーション
 * @param {object} params
 */
function validateParams(params) {
  if (!params || typeof params.researchText !== 'string') {
    throw new Error('研究概要テキストが入力されていません。');
  }
  var len = params.researchText.trim().length;
  if (len < MIN_LENGTH) {
    throw new Error('研究概要は' + MIN_LENGTH + '字以上入力してください。（現在: ' + len + '字）');
  }
  if (len > MAX_LENGTH) {
    throw new Error('研究概要は' + MAX_LENGTH + '字以内で入力してください。（現在: ' + len + '字）');
  }
}
