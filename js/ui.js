/**
 * UIRenderer: v0.05 宣言的UIレンダラー
 * 会社名表示を撤廃し、「地域×職業」求人検索エンジンリンクを自動生成
 */
const UIRenderer = {
    fmt(n) { return n !== undefined && n !== null ? n.toLocaleString('ja-JP') : '-'; },

    renderLeftPanel() {
        // 物流品目リスト
        const pCont = document.getElementById("product-list");
        pCont.innerHTML = "";
        DataStore.logistics.forEach((p, idx) => {
            const btn = document.createElement("div");
            btn.className = `item-card ${idx === 0 ? 'selected' : ''}`;
            btn.innerHTML = `
                <div style="font-size:0.75rem; font-weight:700; color:#fff;">${p.name}</div>
                <div style="font-size:0.62rem; color:var(--ink-dim); margin-top:2px;">物流量: ${this.fmt(p.volume.value)} ${p.volume.unit}</div>
            `;
            btn.onclick = () => {
                document.querySelectorAll("#product-list .item-card").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                MapController.setActiveProduct(p);
            };
            pCont.appendChild(btn);
        });

        // 出典メタデータリスト
        const sCont = document.getElementById("sources-list");
        sCont.innerHTML = "";
        DataStore.sources.forEach(s => {
            const div = document.createElement("div");
            div.innerHTML = `<span class="source-tag tag-${s.type}">[${s.type.toUpperCase()}]</span> <b>${s.title}</b> (${s.organization})`;
            sCont.appendChild(div);
        });

        // 資格一覧
        const qCont = document.getElementById("qualification-list");
        qCont.innerHTML = "";
        DataStore.qualifications.forEach(q => {
            const div = document.createElement("div");
            div.className = "item-card";
            div.innerHTML = `
                <div style="font-weight:700; font-size:0.75rem; color:#fff;">${q.name}</div>
                <div style="font-size:0.62rem; color:var(--ink-dim); margin-top:2px;">キャリア: ${(q.career_tree || []).join(' ➜ ')}</div>
            `;
            qCont.appendChild(div);
        });
    },

    renderDashboard(cityId) {
        const el = document.getElementById("panel-content");
        const city = DataStore.regions.find(c => c.id === cityId);
        if (!city) return;

        const demand = InferenceEngine.calculateDemand(city.id);
        const causalChain = InferenceEngine.getCausalChain(city.id);
        const occupations = InferenceEngine.getOccupationsForCity(city.id);

        const sourcePop = DataStore.sources.find(s => s.id === city.population.source_id);
        const sourcePopType = sourcePop ? sourcePop.type : "official";

        // 税収データ
        const tax = city.tax_revenue || { total: 0, municipal_tax: 0, fixed_asset_tax: 0 };

        // 因果ツリー HTML
        const chainHtml = causalChain.map(c => `
            <div class="chain-step">
                <div style="flex:1;">
                    <div><span class="badge">存在施設</span> <b>${c.facilityName}</b></div>
                    <div style="color:var(--ink-dim); margin:2px 0 4px; font-size:0.65rem;">設備: ${c.equipmentList}</div>
                    <div><span class="badge" style="background:var(--green);">維持需要</span> ${c.maintenanceNeeds}</div>
                    <div style="margin-top:2px;"><span class="badge" style="background:var(--orange);">職種・資格</span> <b>${c.occupationName}</b> (${c.qualifications})</div>
                </div>
            </div>
        `).join('');

        // 職業カード一覧 (v0.05: 会社名非表示・検索リンク連動)
        const occCardsHtml = occupations.map(occ => {
            const isLow = occ.demand && occ.demand.status === "low";
            const pillClass = isLow ? "pill-low" : (occ.demand && occ.demand.score >= 80 ? "pill-high" : "pill-mid");
            const pillLabel = isLow ? "需要低（代替・縮小）" : `需要スコア ${occ.demand ? occ.demand.score : 70}`;

            const qualList = (occ.qualifications && occ.qualifications.preferred || [])
                .concat(occ.qualifications && occ.qualifications.required || [])
                .map(qid => {
                    const q = DataStore.qualifications.find(item => item.id === qid);
                    return q ? q.name : qid;
                }).join(', ') || '特になし(未経験可)';

            // 検索キーワード生成（例: 柏市 自動倉庫 設備保全 求人）
            const searchKeyword = `${city.name} ${occ.search_keyword || occ.name} 求人`;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;

            const lowReasonsHtml = isLow && occ.demand && occ.demand.reasons ? `
                <div class="low-reasons">
                    <b>⚠️ 需要が限定的な要因:</b><br>
                    ${occ.demand.reasons.map(r => `・${r}`).join('<br>')}
                </div>
            ` : '';

            return `
                <div class="occ-card ${isLow ? 'low-demand' : ''}">
                    <div class="occ-header">
                        <div>
                            <div class="occ-name">${occ.name}</div>
                            <div style="font-size:0.65rem; color:var(--ink-dim); margin-top:1px;">${occ.description}</div>
                        </div>
                        <span class="demand-pill ${pillClass}">${pillLabel}</span>
                    </div>

                    <div class="work-conditions">
                        <div class="cond-box"><div class="c-lbl">身体負荷</div><div class="c-val">★${occ.environment ? occ.environment.physical_load : 2}</div></div>
                        <div class="cond-box"><div class="c-lbl">環境</div><div class="c-val">${occ.environment && occ.environment.indoor ? '屋内' : '屋外'}</div></div>
                        <div class="cond-box"><div class="c-lbl">夜勤</div><div class="c-val">${occ.environment && occ.environment.night_shift ? 'あり' : 'なし'}</div></div>
                        <div class="cond-box"><div class="c-lbl">自動化耐性</div><div class="c-val">${Math.round((occ.automation_resistance || 0.8) * 100)}%</div></div>
                    </div>

                    <div style="font-size:0.68rem; color:var(--ink-dim); margin:4px 0;">
                        <span>📋 有効資格: <b>${qualList}</b></span>
                    </div>

                    ${lowReasonsHtml}

                    <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="search-job-btn">
                        <span>🔎</span> 「${searchKeyword}」で求人を検索 ↗
                    </a>
                </div>
            `;
        }).join('');

        el.innerHTML = `
            <div class="display d-title">${city.name}</div>
            <div style="font-size:0.68rem; color:var(--ink-dim); margin:2px 0 12px;">
                ${city.area} ・ <span class="source-tag tag-${sourcePopType}">人口: ${this.fmt(city.population.value)}人 (出典: ${city.population.year}年)</span>
                ・ 高齢化率: ${city.aging_rate ? city.aging_rate.value : '-'}%
            </div>

            <!-- 地域税収データ (v0.05: 独立指標) -->
            <div class="tax-box">
                <div style="font-size:0.65rem; font-weight:700; color:var(--accent); display:flex; justify-content:space-between;">
                    <span>🏛 自治体税収規模 (参考指標)</span>
                    <span class="source-tag tag-official">2025年決算</span>
                </div>
                <div class="tax-grid">
                    <div class="tax-item"><div class="t-lbl">市税合計</div><div class="t-val mono">${this.fmt(tax.total)} 億円</div></div>
                    <div class="tax-item"><div class="t-lbl">個人市民税</div><div class="t-val mono">${this.fmt(tax.municipal_tax)} 億円</div></div>
                    <div class="tax-item"><div class="t-lbl">固定資産税</div><div class="t-val mono">${this.fmt(tax.fixed_asset_tax)} 億円</div></div>
                    <div class="tax-item"><div class="t-lbl">法人市民税</div><div class="t-val mono">${this.fmt(tax.corporate_municipal_tax || 0)} 億円</div></div>
                </div>
            </div>

            <!-- 需要モデル推計 -->
            <div style="background:rgba(0,0,0,0.4); border:1px solid ${demand.status.color}; border-radius:8px; padding:10px; margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:${demand.status.color};">${demand.status.label}</span>
                    <span class="mono" style="font-size:1.1rem; font-weight:900; color:${demand.status.color};">Score: ${demand.totalScore}</span>
                </div>
                <div class="factor-grid">
                    <div class="factor-box"><div class="lbl">設備集積度</div><div class="val mono">${demand.factors.equipment}%</div></div>
                    <div class="factor-box"><div class="lbl">設備老朽化</div><div class="val mono">${demand.factors.aging}%</div></div>
                    <div class="factor-box"><div class="lbl">自動化耐性</div><div class="val mono">${demand.factors.automation}%</div></div>
                </div>
            </div>

            <!-- 因果ツリー -->
            <div class="cause-chain-box">
                <div style="font-size:0.72rem; font-weight:800; color:var(--accent); margin-bottom:8px;">
                    ⚡ 設備から仕事が生まれる因果ツリー (Graph Resolved)
                </div>
                ${chainHtml}
            </div>

            <!-- 地域職業マスター & 求人検索 -->
            <div class="sec-title mono">REGIONAL OCCUPATIONS & REAL-TIME SEARCH (${occupations.length})</div>
            <div>${occCardsHtml || '<div style="font-size:0.7rem; color:var(--ink-dim);">現在登録された職業データはありません</div>'}</div>
        `;
    }
};
