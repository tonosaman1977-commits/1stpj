# researchSummary 開発進捗状況

## 実装計画

### 開発フェーズ
| フェーズ | 状態 | 解説 |
|---------|:----:|------|
| **Phase 1: 要件定義** | [x] | 要件定義完了 |
| **Phase 2: 実装** | [ ] | GASコード・フロントエンド実装 |
| **Phase 3: デプロイ** | [ ] | GAS WebAppとして公開 |

### ページ管理表
| ID | ページ名 | 権限 | 着手 | 完了 |
|----|---------|------|------|------|
| P-001 | 研究要約生成ページ | 全員（匿名含む） | [ ] | [ ] |

### サポートツール（必要に応じて使用）
| ツール | 解説 |
|---------|------|
| **機能拡張** | リリース後も新機能を追加できます |
| **デバッグ** | エラーが発生したら完全自動で解決します |
| **リファクタリング** | コード品質を大規模に改善します |
| **相談** | プロジェクトに関する汎用的な相談やサポートを提供します |

## Phase 2: 実装チェックリスト

### GASバックエンド
- [ ] Code.gs: doGet / generateSummaries 関数
- [ ] GeminiService.gs: callGeminiAPI / buildPrompt / buildPayload / parseGeminiResponse
- [ ] サーバー側バリデーション（20文字以上・20,000文字以下）

### フロントエンド（index.html）
- [ ] テキストエリア入力UI
- [ ] ローディングスピナー
- [ ] 3セクション表示（30秒説明・3分説明・研究要約）
- [ ] 各セクションのコピーボタン
- [ ] 全まとめてコピーボタン
- [ ] エラーメッセージ + リトライボタン
- [ ] クライアント側バリデーション（20文字以上）

## 付録

### 開発フロー
```
Phase 1: 要件定義 → Phase 2: 実装 → Phase 3: デプロイ
```

### ファイル構成
```
researchSummary/
  Code.gs          # doGet エントリーポイント・generateSummaries 関数
  GeminiService.gs # Gemini API呼び出し（3セクション一括生成）
  index.html       # UI実装
  docs/
    requirements.md
    SCOPE_PROGRESS.md
```

### 将来の統合メモ
- makeTitle / pressRelease / multiLangExplain と同一の GAS ファイル構成を維持
- 関数名: callGeminiAPI / buildPrompt / buildPayload / parseGeminiResponse で統一
- responseSchema: thirtySeconds / threeMinutes / summary（全 STRING 型）
