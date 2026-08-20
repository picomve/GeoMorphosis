'use client';

import { useEffect, useRef, useState } from 'react';
import mockHeatmapData from './mockHeatmapData';

function getPollutionColor(intensity) {
  if (intensity >= 0.75) return '#1e3a8a';
  if (intensity >= 0.5) return '#2563eb';
  if (intensity >= 0.25) return '#60a5fa';
  return '#bfdbfe';
}

function getVegetationColor(intensity) {
  if (intensity >= 0.75) return '#14532d';
  if (intensity >= 0.5) return '#16a34a';
  if (intensity >= 0.25) return '#4ade80';
  return '#bbf7d0';
}

function getRadius(intensity) {
  return 6 + intensity * 14;
}

function buildPointLayer(L, data, colorFn, label) {
  const markers = data.map((point) => {
    const color = colorFn(point.intensity);
    const radius = getRadius(point.intensity);

    const marker = L.circleMarker([point.lat, point.lng], {
      radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.75,
      className: 'geo-point-marker',
    });

    if (point.intensity >= 0.7) {
      marker.on('add', () => {
        const el = marker.getElement();
        if (el) el.classList.add('geo-point-pulse');
      });
    }

    marker.bindPopup(
      '<div style="font-family: inherit; font-size: 13px;">' +
        '<strong>' + label + '</strong><br/>' +
        'Yoğunluk: %' + Math.round(point.intensity * 100) + '<br/>' +
        '<span style="color:#6b7280;">' + point.lat.toFixed(4) + ', ' + point.lng.toFixed(4) + '</span>' +
        '</div>'
    );

    marker.on('mouseover', function () {
      this.setStyle({ weight: 3, fillOpacity: 0.95 });
    });
    marker.on('mouseout', function () {
      this.setStyle({ weight: 2, fillOpacity: 0.75 });
    });

    return marker;
  });

  return L.layerGroup(markers);
}

export default function Map({ onRegionSelect, isDarkMode }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  const [baseMap, setBaseMap] = useState('normal');
  const [activeOverlays, setActiveOverlays] = useState({
    pollution: false,
    vegetation: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      await import('leaflet-draw/dist/leaflet.draw.css');
      await import('leaflet-draw');

      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([39.0, 35.0], 6);

      L.control.zoom({
        position: 'bottomleft',
      }).addTo(map);

      // 1. NORMAL HARİTA
      const normalMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });

      // 2. ÖZEL TONLAMALI KARANLIK HARİTA
      const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        className: 'custom-dark-tiles',
      });

      // 3. UYDU HARİTASI
      const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      });

      if (isDarkMode) {
        darkMap.addTo(map);
      } else {
        normalMap.addTo(map);
      }

      // Nokta tabanlı katmanlar (kirlilik / NDVI)
      const pollutionLayer = buildPointLayer(L, mockHeatmapData, getPollutionColor, 'Kirlilik');
      const vegetationLayer = buildPointLayer(L, mockHeatmapData, getVegetationColor, 'NDVI');

      if (activeOverlays.pollution) pollutionLayer.addTo(map);
      if (activeOverlays.vegetation) vegetationLayer.addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new L.Control.Draw({
        position: 'bottomright',
        edit: {
          featureGroup: drawnItems,
        },
        draw: {
          polygon: true,
          rectangle: true,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
        },
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.clearLayers();

        const layer = e.layer;
        drawnItems.addLayer(layer);

        const geoJsonData = layer.toGeoJSON();
        console.log('Üretilen GeoJSON Verisi:', geoJsonData);

        const center = layer.getBounds().getCenter();
        onRegionSelect?.({
          geoJson: geoJsonData,
          lat: center.lat,
          lng: center.lng,
          radius: 1000,
        });
      });

      mapInstanceRef.current = map;
      layersRef.current = {
        normalMap,
        darkMap,
        satelliteMap,
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

  // Gece/Gündüz modu değiştiğinde haritayı anlık güncelle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.normalMap || !layersRef.current.darkMap) return;

    if (baseMap === 'normal') {
      if (isDarkMode) {
        map.removeLayer(layersRef.current.normalMap);
        layersRef.current.darkMap.addTo(map);
      } else {
        map.removeLayer(layersRef.current.darkMap);
        layersRef.current.normalMap.addTo(map);
      }
    }
  }, [isDarkMode, baseMap]);

  const handleBaseMapChange = (type) => {
    const map = mapInstanceRef.current;
    const { normalMap, darkMap, satelliteMap } = layersRef.current;

    if (!map || type === baseMap) return;

    if (type === 'satellite') {
      map.removeLayer(normalMap);
      if (darkMap) map.removeLayer(darkMap);
      satelliteMap.addTo(map);
    } else {
      map.removeLayer(satelliteMap);
      if (isDarkMode) {
        darkMap.addTo(map);
      } else {
        normalMap.addTo(map);
      }
    }

    setBaseMap(type);
  };

  const handleOverlayToggle = (key) => {
    const map = mapInstanceRef.current;
    const layerMap = {
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
    { key: 'pollution', label: 'Kirlilik Katmanı', color: 'bg-blue-500' },
    { key: 'vegetation', label: 'NDVI (Bitki Örtüsü)', color: 'bg-green-500' },
  ];

  return (
    <div className="relative w-full h-full">
      <style jsx global>{`
        @keyframes geo-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
          }
          70% {
            box-shadow: 0 0 0 14px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        .geo-point-pulse {
          animation: geo-pulse 1.8s infinite;
          border-radius: 50%;
        }
        .geo-point-marker {
          transition: all 0.2s ease-out;
          cursor: pointer;
        }
      `}</style>

      <div ref={mapRef} id="map" className="w-full h-full" />

      {/* Sol Harita Görünümü Paneli */}
      <div className="absolute top-24 left-4 z-[1000] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl p-4 w-64 border border-transparent dark:border-gray-700 transition-colors duration-300">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-300">
          Harita Görünümü
        </h3>

        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mb-4 transition-colors duration-300">
          <button
            onClick={() => handleBaseMapChange('normal')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors duration-300 ${
              baseMap === 'normal'
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Normal
          </button>

          <button
            onClick={() => handleBaseMapChange('satellite')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors duration-300 ${
              baseMap === 'satellite'
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Uydu
          </button>
        </div>

        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-300">
          Katmanlar
        </h3>

        <div className="space-y-2">
          {overlayOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => handleOverlayToggle(option.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-300 ${
                activeOverlays[option.key]
                  ? 'bg-gray-900 dark:bg-gray-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${option.color}`} />
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
            Yoğunluk
          </p>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: '#bfdbfe' }} />
            <span className="text-[11px] text-gray-500 mr-2">Düşük</span>
            <span className="w-4 h-4 rounded-full" style={{ background: '#1e3a8a' }} />
            <span className="text-[11px] text-gray-500">Yüksek</span>
          </div>
        </div>
      </div>
    </div>
  );
}