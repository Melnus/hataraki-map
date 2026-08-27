/**
 * Matcher: JSONの属性から条件一致度をリアルタイム採点
 */
const Matcher = {
    run(conditions) {
        // conditions: { noExp: bool, indoor: bool, noNight: bool, sustainable: bool }
        const scoredJobs = DataStore.jobs.map(job => {
            let score = 50;
            const occ = DataStore.occupations.find(o => o.id === job.occupation_id);
            
            // 未経験判定
            const req = (job.qualifications && job.qualifications.required) || [];
            if (conditions.noExp && req.length === 0) score += 20;

            // 環境判定
            if (conditions.indoor && job.environment && job.environment.indoor) score += 15;

            // 夜勤判定
            if (conditions.noNight && job.work && !job.work.night_shift) score += 15;

            // 持続性判定 (職種の自動化耐性等)
            if (conditions.sustainable && occ) {
                const facs = (occ.facilities || []).map(fid => DataStore.facilities.find(f => f.id === fid)).filter(Boolean);
                const avgAuto = facs.reduce((sum, f) => sum + (f.automation_resistance || 0.8), 0) / (facs.length || 1);
                if (avgAuto >= 0.9) score += 15;
            }

            return { job, occ, score };
        }).sort((a, b) => b.score - a.score);

        return scoredJobs;
    }
};