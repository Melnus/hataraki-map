# はたらきマップ (Hataraki Map) v0.4
> **地域経済・産業設備・資格・キャリア因果連鎖探索システム（千葉県版プロトタイプ）**  
> *※ 本ドキュメントは `README.md` および AIコーディングエージェント向け指示書 `AGENT.md` を兼ねています。*

---
![](https://github.com/Melnus/hataraki-map/blob/main/images/home.jpg)


---

## 1. プロジェクト概要 & コンセプト

### 💡 コンセプト
「はたらきマップ」は、単なる求人検索サイトや行政統計ダッシュボードではありません。  
**「地域に存在する産業・施設・設備から、なぜその仕事が発生し、どの資格・技能・キャリアにつながるのか」** という構造的因果関係を、ゲームのダッシュボードのような3DマップUIで直感的に探索できるWebアプリケーションです。

```text
【因果連鎖の基本構造】
 地域（自治体）
   ↓
 産業・インフラ・物流
   ↓
 施設（拠点）
   ↓
 設備（マテハン、プラント、特高変電等）
   ↓
 維持・保全需要（法定点検、老朽化、自動化）
   ↓
 職種（オペレーター、設備保全等）
   ↓
 資格・技能講習（電工、危険物、フォーク等）
   ↓
 求人 ＆ キャリアパス
```

---

## 2. システムアーキテクチャ (v0.4)

v0.4 では **「データとコードの完全分離」** を実現しています。  
JavaScript/HTML内にはマスターデータや需要モデルの係数を一切ハードコードせず、すべて `json/manifest.json` から読み込まれる正規化JSON群と、それらを解決する推計エンジンによって動的に画面が生成されます。

```text
[ 静的ホスティング (GitHub Pages) ]
      │
      ├── index.html / css/style.css
      ├── json/manifest.json ─── 各種JSONマスター (regions, facilities, occupations, etc.)
      │
      ▼ (fetch)
[ js/data-loader.js ] ─── DataStore (メモリ内コンテナ)
      │
      ▼
[ js/inference.js / js/matcher.js ] ─── 因果グラフ解決 ＆ 需要モデル推計
      │
      ▼
[ js/map.js / js/ui.js ] ─── MapLibre GL 3D描画 ＆ グラスモーフィズムUIレンダリング
```

---

## 3. ディレクトリ構成

```text
hataraki-map/
├── index.html              # メインエントリーポイント（静的HTML）
├── README.md               # 本ドキュメント (AGENT.md 兼用)
├── css/
│   └── style.css           # グラスモーフィズム・ダークテーマスタイル
├── js/
│   ├── app.js              # 全体初期化・イベントリスナー
│   ├── data-loader.js      # manifest起点での全JSON非同期ロード
│   ├── inference.js        # 因果グラフ走査・多変量需要推計エンジン
│   ├── matcher.js          # 希望条件リアルタイムスコアリング
│   ├── map.js              # MapLibre GL JS 3D地図・物流粒子アニメーション
│   └── ui.js               # 宣言的UIレンダリング（因果ツリー・求人カード等）
└── json/
    ├── manifest.json       # 読み込み対象JSONの一覧管理
    ├── regions/            # 地域・自治体マスター (kashiwa.json, narita.json, etc.)
    ├── facilities/         # 施設・設備マスター (automated_warehouse.json, etc.)
    ├── occupations/        # 職種マスター (facility_maintenance.json, etc.)
    ├── qualifications/     # 資格マスター (denko2.json, etc.)
    ├── jobs/
    │   └── jobs.json       # 求人インスタンス
    ├── logistics/
    │   └── logistics.json  # 物流品目・流動ルート
    ├── graph/
    │   └── relationships.json # グラフのエッジ（関係性定義）
    ├── models/
    │   └── demand-model.json  # 需要推計モデルの重み・閾値定義
    └── sources/
        └── sources.json    # 根拠・出典メタデータ (official / estimate / sample)
```

---

## 4. データの追加・拡張手順 (How to Extend)

コード（JS/HTML）を編集することなく、**`json/` 配下にファイルを追加して `manifest.json` に登録するだけ** で新しい地域・職種・資格・施設を拡張できます。

### ① 新しい地域（自治体）を追加する
1. `json/regions/funabashi.json` を作成：
   ```json
   {
     "id": "funabashi",
     "name": "船橋市",
     "area": "東京湾岸地域",
     "location": { "lat": 35.6947, "lng": 139.9825 },
     "population": { "value": 647500, "year": 2026, "type": "official", "source_id": "src_pref_pop" },
     "aging_rate": { "value": 25.8, "year": 2026, "type": "official", "source_id": "src_pref_pop" },
     "facilities": ["automated_warehouse", "food_cold_hub"]
   }
   ```
2. `json/manifest.json` の `"regions"` 配列に `"funabashi.json"` を追加。

### ② 新しい職種を追加する
1. `json/occupations/crane_operator.json` を作成：
   ```json
   {
     "id": "crane_operator",
     "name": "クレーン・デリック運転士",
     "category": "logistics",
     "description": "港湾・大型倉庫等での重量物クレーン荷役業務。",
     "work": ["クレーン操作", "玉掛け確認", "日常点検"],
     "qualifications": { "required": ["crane_derrick"], "preferred": ["tamakake"] },
     "facilities": ["airport_cargo_terminal", "hazardous_pipeline_dock"],
     "environment": { "physical_load": 2, "night_shift": false, "indoor": true, "air_conditioned": true },
     "demand_factors": ["logistics_volume", "equipment_stock"]
   }
   ```
2. `json/manifest.json` の `"occupations"` 配列に `"crane_operator.json"` を追加。

---

## 5. ローカル実行 & デプロイ

### 🚀 ローカルで実行する場合
ブラウザのセキュリティ仕様（CORS）により、`fetch()` を使用する本システムは `file://` 直開きではなくローカルWebサーバー経由で開く必要があります。

```bash
# Python 3 を使用する場合（推奨）
python -m http.server 8000

# ブラウザでアクセス
http://localhost:8000
```

### 🌐 GitHub Pages へのデプロイ
1. 本リポジトリを GitHub にプッシュします。
2. リポジトリの **Settings > Pages** を開きます。
3. **Build and deployment > Source** を `Deploy from a branch` に設定し、`main`（または `master`）の `/ (root)` を指定して保存します。
4. 数分後に公開URL（`https://<username>.github.io/<repo>/`）で動作します。

---

## 6. AGENT.md ガイドライン（AI・開発者向け実装規約）

AIコーディングエージェント（Claude, Copilot, ChatGPT等）や今後の開発者が本リポジトリを保守・拡張する際は、**以下の原則を厳格に遵守してください**。

### 🚨 厳守ルール（禁止事項）

1. **JavaScriptへのマスターデータの直接記述（ハードコード）の禁止**
   * 自治体名、職種名、資格名、求人情報、座標、需要モデルの重み係数などを `.js` 内にオブジェクト/配列としてベタ書きしてはいけません。必ず `json/` 内の各ファイルに定義し、IDで参照してください。
2. **ビルドツールの導入禁止（ゼロビルド維持）**
   * `Node.js`、`npm`、`Webpack`、`Vite`、`React`、`TypeScriptコンパイラ` などのビルド環境を必須にしてはいけません。静的HTML/CSS/JS単体でGitHub Pages上で動作する構成を維持してください。
3. **外部APIへの強制依存禁止（相対パス原則）**
   * すべてのデータは `./json/...` の相対パスから取得してください。外部APIサーバーが落ちていても静的JSON群だけで完全動作する構造を守ってください。
4. **架空データの「公式データ」誤認表示禁止**
   * 検証用のダミー求人や推計値には必ず `source_id: "src_sample_job"` 等を付与し、UI上でも `[SAMPLE]` `[ESTIMATE]` を明示してください。

### 📐 データモデル・リレーション設計原則

* **ID参照の徹底**: 別のJSONからエンティティを参照する際は、日本語名称ではなく英数ID（例: `occupation_id: "facility_maintenance"`）を使用してください。
* **因果グラフの維持**:
  * `facilities` は `equipment`（設備）と `maintenance_needs`（維持需要）を保持する。
  * `occupations` は `facilities`（関連施設）と `qualifications`（必要/推奨資格）を保持する。
  * `InferenceEngine.getCausalChain()` がグラフを辿って因果関係を自動解決します。
* **需要推計の数式化**:
  * 需要スコアは `demand-model.json` の重み係数（`factors`）を用いて `InferenceEngine.calculateDemand()` 内で動的に算出してください。

---

## 7. 今後の拡張ロードマップ

- [ ] **千葉県全54市町村へのデータ拡張**（`json/regions/` へのファイル追加）
- [ ] **国土交通省・千葉県オープンデータとの実連携**（`sources.json` 経由での定期更新）
- [ ] **求人APIアダプター（DataProvider拡張）の実装**
- [ ] **人流・通勤圏グラフ（RESASデータ）のレイヤー追加**
