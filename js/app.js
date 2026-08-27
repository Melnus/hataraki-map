/**
 * App: アプリケーション初期化エントリーポイント
 */
document.addEventListener("DOMContentLoaded", async () => {
    const loadingOverlay = document.getElementById("app-loading");
    const loadingDetail = document.getElementById("loading-detail");

    try {
        // 1. JSONデータの全ロード
        await DataLoader.loadAll((msg) => {
            if (loadingDetail) loadingDetail.textContent = msg;
        });

        // 2. 地図の初期化
        MapController.init((cityId) => {
            selectCity(cityId, true);
        });

        // 3. UIの初期描画
        UIRenderer.renderLeftPanel();

        // 4. 初期都市の選択（柏市）
        if (DataStore.regions.length > 0) {
            selectCity(DataStore.regions[0].id, false);
        }

        // 5. イベントリスナー登録
        initEventListeners();

        // ローディング非表示
        if (loadingOverlay) loadingOverlay.style.display = "none";
    } catch (err) {
        console.error("Application Boot Error:", err);
        if (loadingDetail) {
            loadingDetail.innerHTML = `<span style="color:var(--red);">データの読み込みに失敗しました</span><br><span style="font-size:0.6rem;">${err.message}</span>`;
        }
    }
});

function selectCity(cityId, fly = true) {
    const city = DataStore.regions.find(c => c.id === cityId);
    if (!city) return;

    MapController.highlightMarker(cityId);
    UIRenderer.renderDashboard(cityId);

    if (fly) {
        MapController.flyToCity(city);
    }
}

function initEventListeners() {
    // モード切替
    document.querySelectorAll(".mode-btn[data-mode]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mode-btn[data-mode]").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".mode-container").forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const mode = btn.getAttribute("data-mode");
            const target = document.getElementById(`mode-${mode}`);
            if (target) target.classList.add("active");
        });
    });

    // Matcher実行
    const btnMatcher = document.getElementById("btn-run-matcher");
    if (btnMatcher) {
        btnMatcher.addEventListener("click", () => {
            const conditions = {
                noExp: document.getElementById("m-no-exp").checked,
                indoor: document.getElementById("m-indoor").checked,
                noNight: document.getElementById("m-no-night").checked,
                sustainable: document.getElementById("m-sustainable").checked,
                lowPhysical: document.getElementById("m-low-physical").checked
            };

            const results = Matcher.run(conditions);
            if (results.length > 0) {
                const top = results[0];
                alert(`【Matcher 推定完了】\n最高適合職業: ${top.occ.name} (${top.city.name})\n適合スコア: ${top.score}点\n\n「${top.city.name}」へ移動して詳細を表示します。`);
                selectCity(top.city.id, true);
            }
        });
    }
}
