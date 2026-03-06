/**
 * Code.gs - doGet エントリーポイント・generateTitles 関数
 */

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  const html = template.evaluate()
    .setTitle('研究タイトル生成エンジン')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

/**
 * 研究概要テキストから3カテゴリ×5案のタイトルを生成する
 * @param {string} text - 研究概要テキスト
 * @returns {{ academic: string[], general: string[], sns: string[] }}
 */
function generateTitles(text) {
  if (!text || text.length < 10) {
    throw new Error('研究概要は10文字以上入力してください。');
  }
  if (text.length > 20000) {
    throw new Error('研究概要は20,000文字以内で入力してください。');
  }

  return callGeminiAPI(text);
}
