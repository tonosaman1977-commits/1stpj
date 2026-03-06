# 研究発信変換エンジン

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
  Code.gs          # doGet エントリーポイント・メイン処理
  GeminiService.gs # Gemini API呼び出し・2段階パイプライン
  ModeConfig.gs    # mode定義辞書（MODE_CONFIG）
  index.html       # UI実装
```

## APIキー管理

- Gemini APIキーは PropertiesService.getScriptProperties() に保存
- キー名: GEMINI_API_KEY
- コードへのハードコード絶対禁止
- 取得: `PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')`

## Gemini API

- エンドポイント: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`
- 認証: URLパラメータ `?key=YOUR_API_KEY` またはヘッダー `x-goog-api-key`
- response_schema でJSON強制出力（responseMimeType: "application/json"）
- 無料枠: 15 RPM・1,000 RPD（個人利用で十分）
- UrlFetchApp はSSEストリーミング非対応 → ローディングスピナーで代替

## フロントエンド

- google.script.run でGASサーバー呼び出し（CORS問題なし）
- コピー: navigator.clipboard.writeText() をclickイベント直接ハンドラ内で呼ぶ（非同期後はNG）
- イベント: addEventListener ベースで実装（インラインイベント onclick= 禁止）
- viewport: doGet内で addMetaTag('viewport', 'width=device-width, initial-scale=1.0')

## コード品質

- 関数: 100行以下 / ファイル: 700行以下 / 行長: 120文字

## エラー対応

- Gemini APIエラー → エラー内容をUI表示（フォールバックで隠蔽しない）
- JSONパース失敗 → 元のレスポンス文字列をログ出力してユーザーに報告
- タイムアウト（6分）→ 単発処理では通常発生しない。発生時は入力を分割して再試行

## デプロイ

- デプロイはユーザーの明示的な承認を得てから実行
- スクリプトエディタ > デプロイ > 新しいデプロイ > ウェブアプリ
- アクセス権: 「全員（匿名ユーザーを含む）」or「自分のみ」をユーザーと確認
- 詳細: docs/SCOPE_PROGRESS.md Phase 5

## ドキュメント管理

許可されたドキュメントのみ作成可能:
- docs/SCOPE_PROGRESS.md（実装計画・進捗）
- docs/requirements.md（要件定義）
上記以外のドキュメント作成はユーザー許諾が必要。

## Playwright

スクリーンショット保存先: /tmp/bluelamp-screenshots/

## 最新技術情報

- Gemini 2.5 Flash-Lite 無料枠は2025年末に大幅削減（旧情報に注意）
- 現在: 15 RPM・1,000 RPD（2026年3月時点）
- GAS HtmlService のサンドボックスは IFRAMEモード一択（NATIVE/EMULATED廃止済み）
- デプロイ履歴上限200個（超えたら古いものを削除）

## CI/CD設定

### GitHub Actions（PR時に自動実行）
| チェック | 対象 | コマンド |
|---------|------|---------|
| TypeScript | frontend | `npx tsc --noEmit` |
| Lint (JS/TS) | frontend | `npm run lint` |
| Build | frontend | `npm run build` |
| Lint (Python) | backend | `flake8 --max-line-length=120` |
| Format (Python) | backend | `black --check --line-length=120` |

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ

### リポジトリ
- URL: https://github.com/tonosaman1977-commits/1stpj
- 公開設定: Private
