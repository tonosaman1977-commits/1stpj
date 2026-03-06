# 研究発信変換エンジン - SCOPE_PROGRESS

## Phase 1: 要件定義 [x]
完了日: 2026-03-06

## Phase 1.5: Git/GitHub環境構築 [x]
完了日: 2026-03-06
- [x] GitHub アカウント作成（tonosaman1977-commits）
- [x] GitHub CLI 認証完了
- [x] git config 設定（user.name / user.email）
- [x] .gitignore 作成
- [x] リポジトリ初期化・GitHub接続（Private）
- [x] Git hooks設定（日時自動追加）
- [x] 初回コミット・プッシュ（main）
- [x] GitHub Actions CI設定
- [x] CLAUDE.mdにCI/CD設定追記
- [x] developブランチ作成・プッシュ
リポジトリ: https://github.com/tonosaman1977-commits/1stpj

## Phase 2: GAS プロジェクト作成・初期設定 [ ]
- [ ] GAS プロジェクト新規作成
- [ ] APIキーを PropertiesService に登録
- [ ] doGet でWebApp として動作確認

## Phase 3: AI パイプライン実装 [ ]
- [ ] GeminiService.gs: callGemini() 基盤実装
- [ ] ModeConfig.gs: MODE_CONFIG 定義
- [ ] Step A: buildResearchCard() 実装・テスト
- [ ] Step B: renderByMode() 実装・テスト
- [ ] assembleOutputs() 実装・テスト

## Phase 4: フロントエンド実装 [ ]
- [ ] index.html: 入力エリア（テキスト/PDFタブ）
- [ ] 詳細オプション折りたたみ
- [ ] 生成ボタン + ローディングスピナー
- [ ] 出力3タブ（Web/SNS/やさしい日本語）
- [ ] コピーボタン（navigator.clipboard）
- [ ] 共通メタ表示（折りたたみ）
- [ ] モバイル対応

## Phase 5: 結合テスト・デプロイ [ ]
- [ ] テキスト入力での一連フロー確認
- [ ] PDFアップロードでの一連フロー確認
- [ ] GAS WebApp としてデプロイ
- [ ] 動作確認（貼る→出る→コピペ）

---

## 統合ページ管理表

| ID | ページ名 | ルート | 権限 | 着手 | 完了 |
|----|---------|-------|------|------|------|
| P-001 | メイン変換画面 | GAS WebApp URL | 全員 | [ ] | [ ] |
