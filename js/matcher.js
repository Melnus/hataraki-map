/**
 * Matcher: 労働条件・環境から適合する職業と地域を逆引き採点
 */
const Matcher = {
    run(conditions) {
        const scoredOccupations = [];

        DataStore.regions.forEach(city => {
            const cityOccs = InferenceEngine.getOccupationsForCity(city.id);
            cityOccs.forEach(occ => {
                let score = 50;

                // 未経験判定
                const req = (occ.qualifications && occ.qualifications.required) || [];
                if (conditions.noExp && req.length === 0) score += 15;

                // 屋内判定
                if (conditions.indoor && occ.environment && occ.environment.indoor) score += 15;

                // 夜勤なし判定
                if (conditions.noNight && occ.environment && !occ.environment.night_shift) score += 10;

                // 持続需要 (自動化耐性)
                if (conditions.sustainable && (occ.automation_resistance || 0.8) >= 0.8) score += 10;

                // 身体負荷判定
                if (conditions.lowPhysical && occ.environment && occ.environment.physical_load <= 2) score += 10;

                scoredOccupations.push({
                    city,
                    occ,
                    score
                });
            });
        });

        return scoredOccupations.sort((a, b) => b.score - a.score);
    }
};
