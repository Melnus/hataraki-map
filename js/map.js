/**
 * MapController: MapLibre GL JS による3Dマップおよびアニメーション管理
 */
const MapController = {
    map: null,
    activeProduct: null,
    particleProgress: 0,
    markersMap: {},

    init(onCityClick) {
        this.map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/dark',
            center: [140.15, 35.55],
            zoom: 9.2,
            pitch: 45,
            bearing: -10,
            antialias: true
        });

        this.map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

        this.map.on('load', () => {
            this._initLogisticsSources();
            this.renderCityMarkers(onCityClick);
            if (DataStore.logistics.length > 0) {
                this.setActiveProduct(DataStore.logistics[0]);
            }
            this._startParticleLoop();
        });
    },

    _createCurve(from, to) {
        const mid = [(from[0] + to[0]) / 2 + (to[1] - from[1]) * 0.15, (from[1] + to[1]) / 2 - (to[0] - from[0]) * 0.15];
        const pts = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const lng = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * mid[0] + t * t * to[0];
            const lat = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * mid[1] + t * t * to[1];
            pts.push([lng, lat]);
        }
        return pts;
    },

    _initLogisticsSources() {
        this.map.addSource('logistics-line-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        this.map.addLayer({
            id: 'logistics-line-glow', type: 'line', source: 'logistics-line-src',
            paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'glowWidth'], 'line-opacity': 0.35, 'line-blur': 4 }
        });
        this.map.addLayer({
            id: 'logistics-line-core', type: 'line', source: 'logistics-line-src',
            paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'coreWidth'], 'line-opacity': 0.85 }
        });

        this.map.addSource('logistics-particles-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        this.map.addLayer({
            id: 'logistics-particles-layer', type: 'circle', source: 'logistics-particles-src',
            paint: { 'circle-radius': 5.5, 'circle-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-color': ['get', 'color'], 'circle-blur': 0.2 }
        });
    },

    setActiveProduct(product) {
        this.activeProduct = product;
        if (!this.map.getSource('logistics-line-src')) return;

        const lineFeatures = (product.routes || []).map(r => {
            const coords = this._createCurve(r.from, r.to);
            return {
                type: 'Feature',
                properties: { color: product.color, coreWidth: r.width, glowWidth: r.width * 3 },
                geometry: { type: 'LineString', coordinates: coords }
            };
        });

        this.map.getSource('logistics-line-src').setData({ type: 'FeatureCollection', features: lineFeatures });
    },

    _startParticleLoop() {
        const animate = () => {
            this.particleProgress = (this.particleProgress + 0.008) % 1.0;
            if (this.activeProduct && this.map.getSource('logistics-particles-src')) {
                const particleFeatures = [];
                (this.activeProduct.routes || []).forEach(r => {
                    const coords = this._createCurve(r.from, r.to);
                    for (let p = 0; p < 3; p++) {
                        const shift = (this.particleProgress + p * 0.33) % 1.0;
                        const idx = Math.floor(shift * (coords.length - 1));
                        const point = coords[idx];
                        if (point) {
                            particleFeatures.push({
                                type: 'Feature',
                                properties: { color: this.activeProduct.color },
                                geometry: { type: 'Point', coordinates: point }
                            });
                        }
                    }
                });
                this.map.getSource('logistics-particles-src').setData({ type: 'FeatureCollection', features: particleFeatures });
            }
            requestAnimationFrame(animate);
        };
        animate();
    },

    renderCityMarkers(onCityClick) {
        DataStore.regions.forEach(c => {
            const demand = InferenceEngine.calculateDemand(c.id);
            const color = demand && demand.status ? demand.status.color : '#3ddc97';

            const el = document.createElement('div');
            el.className = 'muni-marker';
            el.style.color = color;
            el.style.background = color;
            el.style.boxShadow = `0 0 16px ${color}`;
            el.innerHTML = `<span style="font-size:12px; color:#000; font-weight:900;">🔥</span>`;

            el.onclick = () => onCityClick(c.id);

            new maplibregl.Marker({ element: el })
                .setLngLat([c.location.lng, c.location.lat])
                .addTo(this.map);

            this.markersMap[c.id] = el;
        });
    },

    highlightMarker(cityId) {
        Object.keys(this.markersMap).forEach(id => {
            if (id === cityId) {
                this.markersMap[id].classList.add('selected');
                this.markersMap[id].classList.remove('dimmed');
            } else {
                this.markersMap[id].classList.remove('selected');
                this.markersMap[id].classList.add('dimmed');
            }
        });
    },

    flyToCity(city) {
        if (!city || !city.location) return;
        this.map.flyTo({
            center: [city.location.lng, city.location.lat],
            zoom: 11.5,
            pitch: 50,
            bearing: -12,
            duration: 1400
        });
    }
};