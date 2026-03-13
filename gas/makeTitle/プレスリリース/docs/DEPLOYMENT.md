# Threads自動投稿アプリ デプロイ手順書

## システム構成

```
Frontend: React/TypeScript/Vite → 静的ファイルホスティング (Vercel推奨)
Backend:  FastAPI/Python       → PaaS (Render / Railway 推奨)
Database: PostgreSQL           → 接続先はバックエンドと同じPaaS
```

---

## 1. 環境変数一覧

### バックエンド必須環境変数

| 変数名 | 説明 | 生成方法 |
|--------|------|---------|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | JWT署名キー（最低32文字） | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FERNET_KEY` | Threadsトークン暗号化キー（必須） | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `GEMINI_API_KEY` | Gemini AI APIキー | Google AI Studio で取得 |
| `THREADS_APP_ID` | Threads APIアプリID | Meta Developer Portalで取得 |
| `THREADS_APP_SECRET` | Threads APIシークレット | Meta Developer Portalで取得 |
| `THREADS_REDIRECT_URI` | OAuthコールバックURL | `https://<backend-domain>/api/auth/threads/callback` |
| `FRONTEND_URL` | フロントエンドURL（CORS・リダイレクト用） | `https://<frontend-domain>` |

### フロントエンド必須環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_API_BASE_URL` | バックエンドAPIのベースURL |

---

## 2. バックエンドデプロイ手順（Render）

### 2.1 初回デプロイ

```bash
# 1. Renderダッシュボードで "New Web Service" を作成
#    - Runtime: Python 3.12
#    - Build Command: pip install -r requirements.txt
#    - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
#    - ルートディレクトリ: backend/

# 2. Environment Variables に上記の必須変数を全て設定

# 3. データベース作成
#    Render Dashboard → "New PostgreSQL" → DATABASE_URL をコピーして設定
```

### 2.2 更新デプロイ

```bash
git push origin main  # GitHub連携で自動デプロイ (CI通過後)
```

---

## 3. フロントエンドデプロイ手順（Vercel）

```bash
# 1. Vercel CLI または Vercel Dashboard でプロジェクトをインポート
#    - Framework: Vite
#    - Root Directory: frontend/
#    - Build Command: npm run build
#    - Output Directory: dist/

# 2. Environment Variables に VITE_API_BASE_URL を設定

# 3. デプロイ後、Render側の FRONTEND_URL を Vercel URL に更新
```

---

## 4. Threads OAuthアプリ設定

```
1. Meta Developer Portal → アプリを作成
2. Threads API を追加
3. Redirect URI に THREADS_REDIRECT_URI を登録
4. App IDとApp Secretを取得してバックエンド環境変数に設定
```

---

## 5. バックアップ手順

### データベースバックアップ

```bash
# PostgreSQL ダンプ（手動、月次推奨）
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Render PostgreSQLの場合: Dashboardから "Backup" タブで手動バックアップ可能
# または Render Pro プランで自動日次バックアップ
```

### 環境変数バックアップ

```
- Render Dashboard → Environment → 全変数をパスワードマネージャー（1Password等）に保存
- FERNET_KEY を紛失すると暗号化済みTokensが全て復号不能になるため特に重要
```

### リストア手順

```bash
# 1. 新規PostgreSQLインスタンスを作成して DATABASE_URL を更新
psql $NEW_DATABASE_URL < backup_YYYYMMDD.sql

# 2. バックエンドを再起動（Render: Manual Deploy）
```

---

## 6. ヘルスチェック確認

```bash
# デプロイ後に確認するエンドポイント
curl https://<backend-domain>/health
# → {"status": "ok"}

curl -H "Authorization: Bearer <token>" https://<backend-domain>/metrics
# → {"users_total": N, ...}
```

---

## 7. ロールバック手順

```bash
# Render Dashboard → Deploys → 前のデプロイを選択 → "Redeploy"
# または git revert でコミットを戻してpush
git revert HEAD
git push origin main
```
