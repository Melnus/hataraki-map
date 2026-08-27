# AGENT.md - AI コーディングエージェント向け指示書

このプロジェクト「はたらきマップ」の改修を行う際は、以下の原則を最優先で厳守してください。
プロジェクト全体の仕様・設計・データ構造の詳細は [README.md](./README.md) を参照してください。

---

## 🚨 最優先厳守ルール（CRITICAL RULES）

1. **JavaScriptへのマスターデータの直接記述（ハードコード）の絶対禁止**
   - 自治体名、職種名、資格名、求人情報、座標、需要モデルの重み係数などを `.js` 内に直接書いてはいけません。
   - 新しいデータは必ず `json/` 配下の適切なフォルダに個別JSONとして追加し、`json/manifest.json` に登録してください。
2. **ビルドツールの導入禁止（ゼロビルド・GitHub Pages前提）**
   - Node.js, npm, Webpack, Vite, React, TypeScript等のビルド環境・パッケージを導入してはいけません。
   - 静的な Vanilla HTML / CSS / JavaScript のみで動作させてください。
3. **外部APIへの強制依存禁止（相対パス原則）**
   - データ取得は必ず `./json/...` の相対パスで行い、ローカルおよび GitHub Pages で完全動作させてください。
4. **ID参照の徹底**
   - データ間のリレーションは日本語名ではなく、必ず英数ID（例: `occupation_id: "facility_maintenance"`）で参照・解決してください。

---

## 📂 実装時の参照先

- **データ追加・拡張方法**: `README.md` の「4. データの追加・拡張手順」を参照
- **推計・因果グラフのロジック**: `js/inference.js` および `json/models/demand-model.json`
- **地図・アニメーション制御**: `js/map.js`
- **UIレンダリング**: `js/ui.js`