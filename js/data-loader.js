/**
 * DataStore: アプリケーション全体で共有されるデータコンテナ
 * JavaScript内には一切のマスターデータを直書きしない
 */
const DataStore = {
    regions: [],
    facilities: [],
    occupations: [],
    qualifications: [],
    jobs: [],
    logistics: [],
    relationships: [],
    demandModel: null,
    sources: []
};

/**
 * DataLoader: manifest.json を起点に各カテゴリのJSONを非同期fetch
 */
const DataLoader = {
    async loadAll(onProgress) {
        try {
            if (onProgress) onProgress("manifest.json を読み込み中...");
            const manifestRes = await fetch("./json/manifest.json");
            if (!manifestRes.ok) throw new Error(`manifest.json の取得に失敗しました (HTTP ${manifestRes.status})`);
            const manifest = await manifestRes.json();

            // 1. Regions
            DataStore.regions = await this._loadCategory(manifest.regions, "regions", onProgress);
            // 2. Facilities
            DataStore.facilities = await this._loadCategory(manifest.facilities, "facilities", onProgress);
            // 3. Occupations
            DataStore.occupations = await this._loadCategory(manifest.occupations, "occupations", onProgress);
            // 4. Qualifications
            DataStore.qualifications = await this._loadCategory(manifest.qualifications, "qualifications", onProgress);
            // 5. Jobs
            const jobsData = await this._loadCategory(manifest.jobs, "jobs", onProgress);
            DataStore.jobs = jobsData.flat();
            // 6. Logistics
            const logisticsData = await this._loadCategory(manifest.logistics, "logistics", onProgress);
            DataStore.logistics = logisticsData.flat();
            // 7. Graph (Relationships)
            const graphData = await this._loadCategory(manifest.graph, "graph", onProgress);
            DataStore.relationships = graphData[0] ? graphData[0].edges : [];
            // 8. Models
            const modelData = await this._loadCategory(manifest.models, "models", onProgress);
            DataStore.demandModel = modelData[0] || null;
            // 9. Sources
            const sourcesData = await this._loadCategory(manifest.sources, "sources", onProgress);
            DataStore.sources = sourcesData.flat();

            return DataStore;
        } catch (err) {
            console.error("DataLoader Error:", err);
            throw err;
        }
    },

    async _loadCategory(fileList, dirName, onProgress) {
        if (!fileList || !Array.isArray(fileList)) return [];
        const results = [];
        for (const fileName of fileList) {
            const url = `./json/${dirName}/${fileName}`;
            if (onProgress) onProgress(`${dirName}/${fileName} を取得中...`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ファイルが見つかりません: ${url} (HTTP ${res.status})`);
            const data = await res.json();
            results.push(data);
        }
        return results;
    }
};