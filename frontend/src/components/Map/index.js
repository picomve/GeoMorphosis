"use client";

import { useEffect, useRef, useState } from 'react';
import mockHeatmapData from './mockHeatmapData';

// Maksimum seçilebilir alan sınırı (m² cinsinden)
// Örnek: 25 km² = 25,000,000 m² (İstediğin değere göre değiştirebilirsin)
const MAX_AREA_SQ_METERS = 25 * 1000 * 1000;

export default function Map({ onRegionSelect, isDarkMode }) {
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
      await import('leaflet-draw/dist/leaflet.draw.css');
      await import('leaflet-draw');

      if (mapInstanceRef.current) return;

      // --- ALAN HESAPLAMA & SINIRLANDIRMA FONKSİYONLARI ---
      const calculateGeodesicArea = (latLngs) => {
        return L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : computeApproxArea(latLngs);
      };

      // Basit geodesic alan hesabı (Harici kütüphaneye bağımlı kalmamak için)
      const computeApproxArea = (coords) => {
        const RADIUS = 6378137;
        let area = 0;
        const len = coords.length;
        if (len < 3) return 0;

        for (let i = 0; i < len; i++) {
          const p1 = coords[i];
          const p2 = coords[(i + 1) % len];
          area += ((p2.lng - p1.lng) * (Math.PI / 180)) *
                  (2 + Math.sin(p1.lat * (Math.PI / 180)) + Math.sin(p2.lat * (Math.PI / 180)));
        }
        return Math.abs((area * RADIUS * RADIUS) / 2.0);
      };

      // Dikdörtgen çizilirken sınır aşımında farenin gidebileceği maksimum noktayı hesaplar
      const clampRectangleLatLng = (startLatLng, currentLatLng, maxArea) => {
        const south = Math.min(startLatLng.lat, currentLatLng.lat);
        const north = Math.max(startLatLng.lat, currentLatLng.lat);
        const west = Math.min(startLatLng.lng, currentLatLng.lng);
        const east = Math.max(startLatLng.lng, currentLatLng.lng);

        const corners = [
          L.latLng(south, west),
          L.latLng(north, west),
          L.latLng(north, east),
          L.latLng(south, east)
        ];

        const currentArea = computeApproxArea(corners);

        if (currentArea > maxArea) {
          const scale = Math.sqrt(maxArea / currentArea);
          const latDiff = (currentLatLng.lat - startLatLng.lat) * scale;
          const lngDiff = (currentLatLng.lng - startLatLng.lng) * scale;

          return L.latLng(startLatLng.lat + latDiff, startLatLng.lng + lngDiff);
        }
        return currentLatLng;
      };

      // Leaflet.Draw Dikdörtgen Sürükleme Davranışını Genişletme
      if (L.Draw && L.Draw.Rectangle) {
        L.Draw.Rectangle.prototype._onMouseMove = function (e) {
          const latlng = e.latlng;
          this._tooltip.updatePosition(latlng);

          if (this._isDrawing) {
            // Alanı sınırla: max limitin üstüne çıkarsa koordinatı frenle
            const clampedLatLng = clampRectangleLatLng(this._startLatLng, latlng, MAX_AREA_SQ_METERS);
            this._drawShape(clampedLatLng);
          }
        };
      }
      // ----------------------------------------------------

      const map = L.map(mapRef.current, { zoomControl: false }).setView([39.0, 35.0], 6);

      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      const normalMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });

      const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        className: 'custom-dark-tiles',
      });

      const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      });

      if (isDarkMode) darkMap.addTo(map);
      else normalMap.addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new L.Control.Draw({
        position: 'bottomright',
        edit: { featureGroup: drawnItems },
        draw: { 
          polygon: true, 
          rectangle: true, 
          circle: false, 
          circlemarker: false, 
          marker: false, 
          polyline: false 
        },
      });

      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.clearLayers();
        const layer = e.layer;
        
        // Poligon çizimlerinde tamamlanma anında alan kontrolü
        let latLngs = layer.getLatLngs();
        if (Array.isArray(latLngs[0])) latLngs = latLngs[0];
        const drawnArea = computeApproxArea(latLngs);

        if (drawnArea > MAX_AREA_SQ_METERS) {
          alert(`Seçilen alan maksimum sınırı (${(MAX_AREA_SQ_METERS / 1000000).toFixed(0)} km²) aşıyor! Lütfen daha küçük bir alan seçin.`);
          return;
        }

        drawnItems.addLayer(layer);

        const geoJsonData = layer.toGeoJSON();
        const center = layer.getBounds().getCenter();

        onRegionSelect?.({
          geoJson: geoJsonData,
          lat: center.lat,
          lng: center.lng,
          radius: 1000,
        });
      });

      mapInstanceRef.current = map;
      layersRef.current = { normalMap, darkMap, satelliteMap };
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onRegionSelect, isDarkMode]);

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
      if (isDarkMode) darkMap.addTo(map);
      else normalMap.addTo(map);
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
      if (next[key]) layer.addTo(map);
      else map.removeLayer(layer);
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

      {/* Sol Harita Görünümü Paneli */}
      <div className="absolute top-24 left-4 z-[1000] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl p-4 w-64 border border-transparent dark:border-gray-700 transition-colors duration-300">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-300">Harita Görünümü</h3>

        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mb-4 transition-colors duration-300">
          <button onClick={() => handleBaseMapChange('normal')} className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors duration-300 ${baseMap === 'normal' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            Normal
          </button>

          <button onClick={() => handleBaseMapChange('satellite')} className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors duration-300 ${baseMap === 'satellite' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            Uydu
          </button>
        </div>

        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-300">Katmanlar</h3>

        <div className="space-y-2">
          {overlayOptions.map((option) => (
            <button key={option.key} onClick={() => handleOverlayToggle(option.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-300 ${activeOverlays[option.key] ? 'bg-gray-900 dark:bg-gray-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <span className={`w-3 h-3 rounded-full ${option.color}`} />
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}