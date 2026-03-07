/**
 * Code.gs - doGet エントリーポイント・generateExplanations 関数
 */

function doGet() {
  var html = HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('多言語研究説明エンジン')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

/**
 * 研究概要テキストから多言語説明を生成する
 * @param {string} text - 研究概要テキスト（20〜20,000文字）
 * @param {string[]} selectedLanguages - 追加生成する言語コードの配列
 * @returns {object} 説明文オブジェクト
 */
function generateExplanations(text, selectedLanguages) {
  if (!text || text.length < 20) {
    throw new Error('研究概要は20文字以上入力してください。');
  }
  if (text.length > 20000) {
    throw new Error('研究概要は20,000文字以内で入力してください。');
  }

  var langs = Array.isArray(selectedLanguages) ? selectedLanguages : [];
  return callGeminiAPI(text, langs);
}
