/**
 * GeminiService.gs - 共有 Gemini API 呼び出し
 */

var GEMINI_ENDPOINT_ = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

/**
 * Gemini API を呼び出して JSON を返す
 * @param {object} requestBody - Gemini API リクエストボディ
 * @returns {object}
 */
function callGemini_(requestBody) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY が未設定です。スクリプトプロパティに登録してください。');

  var response = UrlFetchApp.fetch(GEMINI_ENDPOINT_ + '?key=' + apiKey, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code !== 200) throw new Error('Gemini API エラー ' + code + ': ' + text);

  var result = JSON.parse(text);
  var content = result.candidates[0].content.parts[0].text;
  try {
    return JSON.parse(content);
  } catch (e) {
    Logger.log('JSONパース失敗: ' + content);
    throw new Error('レスポンスのJSONパース失敗: ' + content.substring(0, 300));
  }
}
