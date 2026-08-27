/**
 * InferenceEngine: JSONデータのみを使用して多面的な需要スコアと因果チェーンを推計
 */
const InferenceEngine = {
    calculateDemand(cityId) {
        const city = DataStore.regions.find(c => c.id === cityId);
        if (!city || !DataStore.demandModel) return null;

        const model = DataStore.demandModel.factors;
        
        const facilities = (city.facilities || [])
            .map(fid => DataStore.facilities.find(f => f.id === fid))
            .filter(Boolean);
            
        const avgAutoRes = facilities.length > 0
            ? facilities.reduce((sum, f) => sum + (f.automation_resistance || 0.8), 0) / facilities.length
            : 0.8;

        const equipScore = Math.min(100, facilities.length * 35);
        const agingScore = Math.min(100, ((city.aging_rate ? city.aging_rate.value : 25) - 20) * 5);
        const legalScore = facilities.some(f => f.category === 'chemical' || f.category === 'energy' || f.category === 'steel') ? 95 : 75;
        const autoScore = avgAutoRes * 100;
        const shortageScore = 80;

        const totalScore = Math.round(
            equipScore * model.equipment_stock +
            agingScore * model.aging_equipment +
            legalScore * model.legal_inspection +
            autoScore * model.automation_resistance +
            shortageScore * model.labor_shortage
        );

        const status = DataStore.demandModel.labels.find(l => totalScore >= l.min && totalScore <= l.max) 
                    || DataStore.demandModel.labels[0];

        return {
            totalScore,
            status,
            factors: {
                equipment: Math.round(equipScore),
                aging: Math.round(agingScore),
                legal: Math.round(legalScore),
                automation: Math.round(autoScore)
            },
            facilities
        };
    },

    getCausalChain(cityId) {
        const city = DataStore.regions.find(c => c.id === cityId);
        if (!city) return [];

        const facilities = (city.facilities || [])
            .map(fid => DataStore.facilities.find(f => f.id === fid))
            .filter(Boolean);

        const chain = [];
        facilities.forEach(fac => {
            const occs = DataStore.occupations.filter(o => (o.facilities || []).includes(fac.id));
            occs.forEach(occ => {
                const reqQuals = (occ.qualifications && occ.qualifications.required) || [];
                const prefQuals = (occ.qualifications && occ.qualifications.preferred) || [];
                const allQualIds = [...new Set([...reqQuals, ...prefQuals])];

                const quals = allQualIds
                    .map(qid => DataStore.qualifications.find(q => q.id === qid))
                    .filter(Boolean);

                chain.push({
                    facilityName: fac.name,
                    equipmentList: (fac.equipment || []).join(", "),
                    maintenanceNeeds: (fac.maintenance_needs || []).join(" / "),
                    occupationName: occ.name,
                    qualifications: quals.map(q => q.name).join(", ") || "特になし(未経験可)"
                });
            });
        });
        return chain;
    },

    getOccupationsForCity(cityId) {
        const city = DataStore.regions.find(c => c.id === cityId);
        if (!city) return [];

        const facilities = (city.facilities || []);
        return DataStore.occupations.filter(occ => 
            (occ.facilities || []).some(fid => facilities.includes(fid))
        );
    }
};
