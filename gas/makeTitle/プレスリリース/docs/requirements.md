# Threads自動投稿アプリ 要件定義

## アプリ概要

ユーザーが設定したテーマをもとにAIが投稿文を自動生成し、
**各ユーザー自身のThreadsアカウント**へ1日5回、指定時刻に自動投稿するマルチテナント型Webアプリ。

---

## ユーザーストーリー

- ユーザーは投稿テーマを設定・切り替えられる
- ユーザーは1日5回の投稿時刻を管理画面で自由に変更できる
- AIがテーマに沿った投稿文を自動生成し、設定時刻にThreadsへ投稿する
- 過去の投稿履歴を確認できる
- ユーザーはOAuth認証で自分のThreadsアカウントをアプリに連携できる
- 連携済みのThreadsアカウントへ自動投稿される（他ユーザーのアカウントとは完全に分離）

---

## 機能要件

### 認証
- メール + パスワードでログイン
- ユーザーごとに設定・履歴を管理

### テーマ管理
- テーマ名と説明文を登録・編集・削除
- 複数テーマを保持し、投稿に使うテーマを1つ選択（アクティブ切り替え）

### スケジュール設定
- 1日5回の投稿時刻をHH:MM形式で設定
- 設定はユーザーごとに独立

### AI文章生成
- アクティブテーマに基づきGemini APIで投稿文を自動生成
- Threads投稿形式（500文字以内、ハッシュタグ付き）

### Threads OAuth連携（新規）
- アプリ内ボタンからMeta OAuth 2.0認可コードフローを起動
- 認可完了後、アクセストークンをDBに暗号化して保存
- 連携状態（済み/未連携/期限切れ）をUIで表示
- 1ユーザーにつき1アカウント（DB構造は1対多で将来の複数アカウント切替に対応）

### 自動投稿
- 設定時刻になったらログインユーザーのsns_connectionsからトークンを動的に取得し投稿
- Threads連携未完了または期限切れのユーザーはスキップ（ログに記録）
- 投稿成功・失敗をログに記録

### トークン管理（新規）
- バックグラウンドジョブが期限切れ7日前のトークンを自動リフレッシュ
- リフレッシュ失敗時（認可取り消し等）はDB上でis_expired=Trueにフラグ
- 期限切れユーザーにはUI上に「再連携してください」通知を表示

### 投稿履歴
- 投稿日時・使用テーマ・投稿文・成否を一覧表示

---

## 非機能要件

- レスポンシブ対応（PC・スマホ両対応）
- 投稿失敗時はエラーをUIに表示（隠蔽しない）

---

## 技術スタック

```yaml
フロントエンド:
  フレームワーク: React + Vite + TypeScript
  UIライブラリ: MUI (Material UI) v5
  状態管理: Zustand
  ルーティング: React Router v6

バックエンド:
  言語: Python (FastAPI)
  スケジューラ: APScheduler
  DB: SQLite（開発）/ PostgreSQL（本番）

外部API:
  AI: Gemini 2.5 Flash-Lite API
  SNS: Threads API (Meta)

デプロイ:
  フロントエンド: Vercel
  バックエンド: Railway / Render
```

---

## ページ構成

| ページ | パス | 説明 |
|--------|------|------|
| ログイン | /login | メール+パスワード認証 |
| ダッシュボード | /dashboard | 直近の投稿状況・次回投稿時刻 |
| テーマ管理 | /themes | テーマの登録・編集・アクティブ切替 |
| スケジュール設定 | /schedule | 1日5回の投稿時刻設定 |
| 投稿履歴 | /history | 過去の投稿一覧 |

---

## 認証ロール

| ロール | 説明 |
|--------|------|
| user | 一般ユーザー（自分の設定・履歴のみ操作可） |

---

## データ設計（マルチテナント拡張）

### 新規テーブル: sns_connections

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| user_id | FK → users | ユーザーとの紐付け |
| platform | VARCHAR | 固定値 "threads" |
| platform_user_id | VARCHAR | ThreadsユーザーID |
| access_token | TEXT | 暗号化して保存 |
| token_expires_at | TIMESTAMP | トークン有効期限 |
| is_active | BOOLEAN | アクティブな連携（将来の複数アカウント対応） |
| is_expired | BOOLEAN | リフレッシュ失敗フラグ |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

- users : sns_connections = 1 : 多（現在は1ユーザー最大1件 is_active=True）
- アクセストークンはFernet対称暗号化（cryptographyライブラリ）でDBに保存

---

## Threads OAuth 2.0フロー

```
1. ユーザーが「Threadsと連携」ボタンをクリック
2. GET /api/auth/threads/authorize → Meta認可URLへリダイレクト
   - scope: threads_basic, threads_content_publish
3. Meta認可画面 → ユーザーが許可
4. GET /api/auth/threads/callback?code=xxx
   - 短期トークン取得（POST https://graph.threads.net/oauth/access_token）
   - 長期トークンへ交換（GET https://graph.threads.net/access_token）
   - sns_connectionsテーブルへ保存
5. フロントエンドへリダイレクト → 連携済み表示
```

---

## ページ構成（更新）

| ページ | パス | 説明 |
|--------|------|------|
| ログイン | /login | メール+パスワード認証 |
| ダッシュボード | /dashboard | 投稿状況・次回投稿時刻・**Threads連携ステータス** |
| テーマ管理 | /themes | テーマの登録・編集・アクティブ切替 |
| スケジュール設定 | /schedule | 1日5回の投稿時刻設定 |
| 投稿履歴 | /history | 過去の投稿一覧 |

---

## 認証ロール

| ロール | 説明 |
|--------|------|
| user | 一般ユーザー（自分の設定・履歴・SNS連携のみ操作可） |

---

## 制約・前提

- Threads APIの利用にはMeta開発者アカウントとOAuthアプリ登録が必要
  - リダイレクトURI: `{BACKEND_URL}/api/auth/threads/callback` をMeta側に登録
  - 必要なスコープ: `threads_basic`, `threads_content_publish`
- アクセストークンは暗号化してDB保存（平文禁止）
- 暗号化キー（FERNET_KEY）は環境変数で管理
- Gemini APIキーは環境変数で管理（コードへのハードコード禁止）
- 投稿文字数: 500文字以内（Threads制限）
- トークン有効期限: 長期トークン60日（期限7日前に自動リフレッシュ）
