# 研究発信変換エンジン - 要件定義書

## 1. プロジェクト概要

### 成果目標
大学教員が論文テキストをコピペまたはPDFアップロードすると、Web掲載用・SNS投稿用・やさしい日本語の3フォーマットに自動変換し、ワンクリックでコピーできるWebアプリ。

### 成功指標（定量）
1. 入力から3フォーマット生成まで 30秒以内
2. テキストペースト・PDFアップロードの2種類の入力方式に対応
3. 各フォーマットをワンクリックでコピー可能

### 成功指標（定性）
1. 専門用語が多い論文でも一般読者に伝わる言葉に変換される
2. プラットフォームごとのトンマナ（公式/カジュアル/平易）に合った文体が生成される
3. 研究の新規性・貢献が失われずに要約される

---

## 2. システム全体像

### 機能一覧
1. 研究紹介テキスト入力（コピペ）
2. PDFファイルアップロード（base64変換してGemini APIに渡す）
3. 任意オプション設定（audience, goal, constraints, keywords, links）
4. 2段階AI処理（構造化要約 → フォーマット別整形）
5. 3フォーマット表示（Web/SNS/やさしい日本語）
6. ワンクリックコピー
7. 共通メタ表示（title, oneLiner, tags）

### 認証要件
なし（GAS WebApp として公開。アクセス範囲はデプロイ時に設定）

---

## 3. ページ詳細仕様

### P-001: メイン変換画面

| 項目 | 内容 |
|------|------|
| ページID | P-001 |
| ルート | GAS WebApp URL |
| 権限 | 全員（認証なし） |
| 優先度 | 高 |

#### UIレイアウト

```
[入力エリア]
  タブ: "テキスト入力" / "PDFアップロード"
  - テキスト入力: textarea（論文本文をペースト）
  - PDFアップロード: ファイル選択ボタン（.pdf、最大10MB）

[詳細オプション（折りたたみ accordion）]
  - 想定読者 (audience): フリーテキスト（例: 受験生、企業、一般）
  - 目標アクション (goal): フリーテキスト（例: 詳細ページ閲覧）
  - 禁止事項 (constraints): フリーテキスト（例: 誇張禁止）
  - 必須キーワード (keywords): カンマ区切り（3〜8語）
  - 関連URL (links): URL入力

[生成ボタン]
  → クリック後: ローディングスピナー表示（処理中...）

[出力エリア（タブ）]
  Web掲載用 | SNS投稿用 | やさしい日本語
  各タブ: 本文テキスト + [コピー] ボタン

[共通メタ（折りたたみ）]
  タイトル / 一文要約 / ハッシュタグ候補
```

#### 処理フロー

```
1. 入力受付（テキスト or PDF）
   ↓
2. Step A: Gemini API → researchCard (JSON) 生成
   入力: sourceText（PDFはbase64変換済み）+ options
   出力: topic, problem, approach, novelty, impact, evidenceLevel, terms[]
   ↓
3. Step B: researchCard → 3フォーマット同時生成
   入力: researchCard + MODE_CONFIG（3種）
   出力: web.body, sns.body, easy.body + 共通メタ
   ↓
4. JSON解析・UI表示（タブ切り替え、コピー有効化）
```

---

## 4. データ設計概要

### researchCard（中間JSON）

```json
{
  "topic": "string",
  "problem": "string",
  "approach": "string",
  "novelty": "string",
  "impact": "string",
  "evidenceLevel": "検証中 | 査読済 | 実装済",
  "terms": [{"word": "string", "simpleWord": "string"}],
  "keywords": ["string"]
}
```

### 出力JSON

```json
{
  "title": "string（40字以内）",
  "oneLiner": "string（40〜60字）",
  "keyPoints": ["string", "string", "string"],
  "cautions": "string | null",
  "tags": ["string（#付き）"],
  "web": { "body": "string（400〜900字）" },
  "sns": { "body": "string（120〜220字 + CTA1行）" },
  "easy": { "body": "string（250〜500字）" }
}
```

### バリデーション
- sourceText: 必須（テキスト入力時）、10文字以上、50,000文字以内
- PDFファイル: 最大10MB、.pdfのみ
- audience / goal / constraints / keywords / links: 任意、各500文字以内

---

## 5. セキュリティ要件

- HTTPS強制（GAS WebApp はデフォルトHTTPS）
- APIキーは PropertiesService.getScriptProperties() に保存。コードへのハードコード禁止
- 入力値サニタイゼーション（XSS対策、GAS HtmlService の IFRAME モード）
- PDFサイズ上限: 10MB
- ヘルスチェック: doGet で `?action=health` パラメータに応答

---

## 6. 技術スタック

```yaml
フロントエンド:
  - GAS HtmlService (Bootstrap 5 CDN + Vanilla JS)
  - Bootstrap 5: nav-tabs, collapse, grid, spinner
  - navigator.clipboard API（コピー機能）
  - addEventListener ベースの実装（インラインイベント禁止）

バックエンド:
  - Google Apps Script (GAS)
  - UrlFetchApp（Gemini API呼び出し）
  - PropertiesService（APIキー管理）

AI:
  - Gemini 2.5 Flash-Lite API（Google AI Studio）
  - response_schema でJSON強制出力
  - 無料枠: 15 RPM・1,000 RPD

デプロイ:
  - GAS WebApp（スクリプトエディタ > デプロイ > 新しいデプロイ）
  - アクセス: 自分のみ or 全員（設定で変更可）
```

---

## 7. 外部サービス一覧

| サービス | 用途 | 選定理由 | 費用 |
|---------|------|---------|------|
| Google AI Studio | Gemini APIキー発行 | 既存キー活用・無料 | 無料 |
| Gemini 2.5 Flash-Lite API | 2段階AI処理 | 無料枠1,000 RPD・JSON強制出力対応 | 無料 |
| GAS WebApp | ホスティング・バックエンド | Googleアカウントのみで完結 | 無料 |

---

## 8. AI設計

### パターン: 2段階逐次呼び出し

単一ユーザーの1回処理のため、Tool Use自律ループは不要。シンプルな2段階パイプラインで実装。

### Step A: researchCard 生成プロンプト設計

```
[SYSTEM]
役割: 大学研究の紹介文を、誇張せず、用途展開しやすい"構造化要約(JSON)"に変換する。

ルール:
- 不明な点は推測で断定しない（「可能性」「〜を目指す」などに逃がす）
- 固有名詞・専門用語は保持しつつ、言い換えも併記
- JSONのみで返す（余計な文章禁止）
- response_schema に従ったJSONを出力

[USER]
以下の研究紹介文を構造化してください。
---
{sourceText}
---
任意補足情報: {options}
```

### Step B: フォーマット別生成プロンプト設計

| mode | トーン | 文字数 | 構成 | 禁止 |
|------|--------|--------|------|------|
| web_ja_formal | 大学公式ページ風、丁寧 | 400〜900字 | 導入→課題→アプローチ→意義 | 煽り・口語・過度な比喩 |
| sns_ja_hook | 短く興味喚起、カジュアル | 120〜220字 + CTA1行 | フック→要点1〜2→軽いCTA | 固い説明・長い専門語 |
| easy_ja | やさしい日本語、短文 | 250〜500字 | 短文・専門語に言い換え注釈 | 難解な漢語・長文 |

### 品質安全柵

- 成果の断定禁止: 「効果がある」→「可能性がある」「目指す」
- 固有名詞保持: 研究室名・教授名・機関名をそのまま保持（削らない）
- cautions: 医療・法律・安全に関わる内容が含まれる場合は注意書きを出力

---

## 9. GAS モジュール分割

```
Code.gs
  - doGet(e)                          // WebApp エントリーポイント
  - processResearch(payload)          // メイン処理（フロントから呼ぶ）

GeminiService.gs
  - callGemini(prompt, schema)        // Gemini API 呼び出し基盤
  - buildResearchCard(sourceText, options)   // Step A
  - renderByMode(researchCard, mode)         // Step B
  - assembleOutputs(researchCard)            // 3モード並列 → JSON まとめ

ModeConfig.gs
  - MODE_CONFIG                       // mode定義辞書
    { web_ja_formal: { tone, length, structure, forbidden },
      sns_ja_hook:   { ... },
      easy_ja:       { ... } }

index.html
  - UI実装（Bootstrap 5 + Vanilla JS）
  - google.script.run.processResearch(payload)
    .withSuccessHandler(displayResults)
    .withFailureHandler(showError)
```
