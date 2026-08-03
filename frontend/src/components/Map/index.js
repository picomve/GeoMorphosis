'use client';

import { useEffect, useRef, useState } from 'react';
import mockHeatmapData from './mockHeatmapData';

export default function Map({ onRegionSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  const [baseMap, setBaseMap] = useState('normal');
  const [activeOverlays, setActiveOverlays] = useState({
    fire: true,
    pollution: false,
    vegetation: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      await import('leaflet.heat');

      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([39.0, 35.0], 6);

      L.control.zoom({
        position: 'bottomleft',
      }).addTo(map);

      // Normal harita

      const normalMap = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }
      );

      // Uydu katmanı

      const satelliteMap = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles © Esri',
          maxZoom: 19,
        }
      );

      normalMap.addTo(map);

      // Heatmap veri noktaları hazırlanıyor: [lat, lng, intensity]

      const firePoints = mockHeatmapData.map((p) => [
        p.lat,
        p.lng,
        p.intensity,
      ]);

      const pollutionPoints = mockHeatmapData.map((p) => [
        p.lat + 0.2,
        p.lng,
        0.5,
      ]);

      const vegetationPoints = mockHeatmapData.map((p) => [
        p.lat - 0.2,
        p.lng,
        0.75,
      ]);

      // Yangın heatmap (kırmızı-turuncu-sarı)

const fireLayer = L.heatLayer(firePoints, {
  radius: 38,
  blur: 28,
  maxZoom: 9,
  minOpacity: 0.35,
  gradient: {
    0.2: '#22c55e',
    0.5: '#f59e0b',
    0.8: '#ef4444',
  },
});

// Kirlilik heatmap (mavi tonları)

const pollutionLayer = L.heatLayer(pollutionPoints, {
  radius: 38,
  blur: 28,
  maxZoom: 9,
  minOpacity: 0.35,
  gradient: {
    0.3: '#93c5fd',
    0.6: '#3b82f6',
    1.0: '#1e40af',
  },
});

// NDVI heatmap (yeşil tonları)

const vegetationLayer = L.heatLayer(vegetationPoints, {
  radius: 38,
  blur: 28,
  maxZoom: 9,
  minOpacity: 0.35,
  gradient: {
    0.3: '#bbf7d0',
    0.6: '#4ade80',
    1.0: '#15803d',
  },
});

      // Varsayılan olarak yangın katmanı açık

      fireLayer.addTo(map);

      // Bölge seçimi

      let selectedArea = null;

      map.on('click', (e) => {
        if (selectedArea) {
          map.removeLayer(selectedArea);
        }

        selectedArea = L.circle(e.latlng, {
          radius: 5000,
          color: '#2563eb',
          fillColor: '#2563eb',
          fillOpacity: 0.2,
          weight: 3,
        }).addTo(map);

        onRegionSelect?.({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          radius: 5000,
        });
      });

      mapInstanceRef.current = map;
      layersRef.current = {
        normalMap,
        satelliteMap,
        fireLayer,
        pollutionLayer,
        vegetationLayer,
      };
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onRegionSelect]);

  const handleBaseMapChange = (type) => {
    const map = mapInstanceRef.current;
    const { normalMap, satelliteMap } = layersRef.current;

    if (!map || type === baseMap) return;

    if (type === 'satellite') {
      map.removeLayer(normalMap);
      satelliteMap.addTo(map);
    } else {
      map.removeLayer(satelliteMap);
      normalMap.addTo(map);
    }

    setBaseMap(type);
  };

  const handleOverlayToggle = (key) => {
    const map = mapInstanceRef.current;
    const layerMap = {
      fire: layersRef.current.fireLayer,
      pollution: layersRef.current.pollutionLayer,
      vegetation: layersRef.current.vegetationLayer,
    };
    const layer = layerMap[key];

    if (!map || !layer) return;

    setActiveOverlays((prev) => {
      const next = { ...prev, [key]: !prev[key] };

      if (next[key]) {
        layer.addTo(map);
      } else {
        map.removeLayer(layer);
      }

      return next;
    });
  };

  const overlayOptions = [
    { key: 'fire', label: 'Yangın Katmanı', color: 'bg-red-500' },
    { key: 'pollution', label: 'Kirlilik Katmanı', color: 'bg-blue-500' },
    { key: 'vegetation', label: 'NDVI (Bitki Örtüsü)', color: 'bg-green-500' },
  ];

  return (
    <div className="relative w-full h-full">

      <div ref={mapRef} id="map" className="w-full h-full" />

      {/* Katman kontrol paneli */}

      <div className="absolute top-24 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 w-64">

        <h3 className="text-sm font-bold text-gray-700 mb-3">
          Harita Görünümü
        </h3>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">

          <button
            onClick={() => handleBaseMapChange('normal')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${
              baseMap === 'normal'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500'
            }`}
          >
            Normal
          </button>

          <button
            onClick={() => handleBaseMapChange('satellite')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${
              baseMap === 'satellite'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500'
            }`}
          >
            Uydu
          </button>

        </div>

        <h3 className="text-sm font-bold text-gray-700 mb-3">
          Katmanlar
        </h3>

        <div className="space-y-2">

          {overlayOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => handleOverlayToggle(option.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                activeOverlays[option.key]
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${option.color}`} />
              {option.label}
            </button>
          ))}

        </div>

      </div>

    </div>
  );
}