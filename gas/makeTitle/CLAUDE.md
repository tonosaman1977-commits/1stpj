# 研究タイトル生成エンジン

## 基本原則
> 「シンプルさは究極の洗練である」

- **最小性**: 不要なコードは一文字も残さない。必要最小限を超えない
- **単一性**: 真実の源は常に一つ（要件: docs/requirements.md、進捗: docs/SCOPE_PROGRESS.md）
- **刹那性**: 役目を終えたコード・ドキュメントは即座に削除する
- **実証性**: 推測しない。GASログ・APIレスポンスで事実を確認する
- **潔癖性**: エラーは隠さない。フォールバックで問題を隠蔽しない

## プロジェクト設定

```yaml
技術スタック:
  実行環境: Google Apps Script (GAS)
  フロントエンド: GAS HtmlService + Bootstrap 5 CDN + Vanilla JS
  AI: Gemini 2.5 Flash-Lite API (Google AI Studio)
  デプロイ: GAS WebApp

ファイル構成:
  Code.gs          # doGet エントリーポイント・generateTitles 関数
  GeminiService.gs # Gemini API呼び出し（3カテゴリ一括生成）
  index.html       # UI実装
```

## APIキー管理

- Gemini APIキーは PropertiesService.getScriptProperties() に保存
- キー名: GEMINI_API_KEY
- コードへのハードコード絶対禁止
- 取得: `PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')`

## Gemini API

- エンドポイント: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`
- 認証: URLパラメータ `?key=YOUR_API_KEY`
- responseSchema でJSON強制出力（responseMimeType: "application/json"）
- 出力スキーマ: `{ academic: string[], general: string[], sns: string[] }`（各5案）
- 無料枠: 15 RPM・1,000 RPD

## フロントエンド

- google.script.run.generateTitles(text) でGASサーバー呼び出し
- コピー: navigator.clipboard.writeText() をclickイベント直接ハンドラ内で呼ぶ（非同期後はNG）
- イベント: addEventListener ベースで実装（インラインイベント onclick= 禁止）
- ローディングスピナー: API呼び出し中は生成ボタンを無効化し表示
- エラー時: エラーメッセージ + リトライボタンを表示
- viewport: doGet内で addMetaTag('viewport', 'width=device-width, initial-scale=1.0')

## 生成ルール（プロンプト設計）

共通禁止:
- 元研究内容にない事実の追加
- 誇張表現
- 効果の断定

カテゴリ別:
- academic: 客観・簡潔、20〜50文字、論文タイトル形式
- general: 分かりやすい・やや説明的、20〜40文字、専門用語を減らす
- sns: 短い・フック重視、15〜30文字、興味を引く

## コード品質

- 関数: 100行以下 / ファイル: 700行以下 / 行長: 120文字

## エラー対応

- Gemini APIエラー → エラー内容をUI表示（フォールバックで隠蔽しない）
- 入力バリデーションエラー → UI表示（クライアント + サーバー両方でチェック）
- JSONパース失敗 → 元のレスポンス文字列をログ出力してユーザーに報告

## デプロイ

- デプロイはユーザーの明示的な承認を得てから実行
- アクセス権: 「全員（匿名ユーザーを含む）」
- 詳細: docs/SCOPE_PROGRESS.md Phase 3

## ドキュメント管理

許可されたドキュメントのみ作成可能:
- docs/SCOPE_PROGRESS.md（実装計画・進捗）
- docs/requirements.md（要件定義）
上記以外のドキュメント作成はユーザー許諾が必要。

## Playwright

スクリーンショット保存先: /tmp/bluelamp-screenshots/
