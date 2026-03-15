/**
 * ReferenceService.gs - バズりリファレンス投稿の管理（PropertiesService）
 */

var REFERENCE_KEY = 'BUZZ_REFERENCES';
var MAX_REFERENCES = 5;

/**
 * 保存済みリファレンス一覧を取得する
 * @returns {Array<{label: string, content: string}|null>}
 */
function getReferences() {
  var stored = PropertiesService.getScriptProperties().getProperty(REFERENCE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

/**
 * リファレンスを保存する（上書き）
 * @param {number} index - 0〜4
 * @param {string} label - 表示ラベル
 * @param {string} content - 投稿本文
 * @returns {Array} 更新後のリファレンス一覧
 */
function saveReference(index, label, content) {
  if (index < 0 || index >= MAX_REFERENCES) {
    throw new Error('インデックスは0〜' + (MAX_REFERENCES - 1) + ' で指定してください。');
  }
  if (!content || content.trim().length === 0) {
    throw new Error('投稿本文を入力してください。');
  }

  var refs = getReferences();
  while (refs.length <= index) refs.push(null);
  refs[index] = {
    label: label ? label.trim() : ('参考' + (index + 1)),
    content: content.trim()
  };

  PropertiesService.getScriptProperties().setProperty(REFERENCE_KEY, JSON.stringify(refs));
  return refs;
}

/**
 * リファレンスを削除する
 * @param {number} index
 * @returns {Array} 更新後のリファレンス一覧
 */
function deleteReference(index) {
  var refs = getReferences();
  if (index < 0 || index >= refs.length) {
    throw new Error('指定インデックスのリファレンスが存在しません。');
  }
  refs[index] = null;
  // 末尾の null を除去
  while (refs.length > 0 && refs[refs.length - 1] === null) refs.pop();

  PropertiesService.getScriptProperties().setProperty(REFERENCE_KEY, JSON.stringify(refs));
  return refs;
}
