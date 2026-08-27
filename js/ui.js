/**
 * UIRenderer: DataStore と InferenceEngine を読み込んでUIを描画する宣言的レンダラー
 */
const UIRenderer = {
    fmt(n) { return n ? n.toLocaleString('ja-JP') : '-'; },

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
        const jobs = InferenceEngine.getJobsForCity(city.id);

        const sourcePop = DataStore.sources.find(s => s.id === city.population.source_id);
        const sourcePopType = sourcePop ? sourcePop.type : "official";

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

        // 求人カード HTML
        const jobsHtml = jobs.map(j => {
            const occ = DataStore.occupations.find(o => o.id === j.occupation_id);
            const occName = occ ? occ.name : j.title;
            const prefQuals = ((j.qualifications && j.qualifications.preferred) || [])
                .map(qid => {
                    const q = DataStore.qualifications.find(item => item.id === qid);
                    return q ? q.name : qid;
                }).join(', ');

            return `
                <div class="job-card">
                    <span class="sample-tag mono">SAMPLE / 仮データ</span>
                    <div style="font-weight:700; color:#fff; font-size:0.75rem;">${j.title}</div>
                    <div style="color:var(--accent); font-size:0.68rem; margin:2px 0;">${j.company} [${occName}]</div>
                    <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:var(--ink-dim); margin-top:4px;">
                        <span class="mono">💰 ${j.wage.type==='monthly'?'月給':'時給'} ${this.fmt(j.wage.min)}〜${this.fmt(j.wage.max)}円</span>
                        <span>📋 ${prefQuals || '未経験可'}</span>
                    </div>
                </div>
            `;
        }).join('');

        el.innerHTML = `
            <div class="display d-title">${city.name}</div>
            <div style="font-size:0.68rem; color:var(--ink-dim); margin:2px 0 12px;">
                ${city.area} ・ <span class="source-tag tag-${sourcePopType}">人口: ${this.fmt(city.population.value)}人 (${city.population.year}年)</span>
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

            <!-- 求人一覧 -->
            <div class="sec-title mono">REGISTERED JOB INSTANCES (${jobs.length})</div>
            <div>${jobsHtml || '<div style="font-size:0.7rem; color:var(--ink-dim);">現在登録された求人データはありません</div>'}</div>
        `;
    }
};