'use client';

import { useEffect, useRef, useState } from 'react';
import mockHeatmapData from './mockHeatmapData';

function getFireColor(intensity) {
  if (intensity >= 0.75) return '#b91c1c';
  if (intensity >= 0.5) return '#ef4444';
  if (intensity >= 0.25) return '#f97316';
  return '#fbbf24';
}

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

      await import('leaflet-draw/dist/leaflet.draw.css');
      await import('leaflet-draw');

      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([39.0, 35.0], 6);

      L.control.zoom({
        position: 'bottomleft',
      }).addTo(map);

      const normalMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });

      const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      });

      normalMap.addTo(map);

      const fireLayer = buildPointLayer(L, mockHeatmapData, getFireColor, 'Yangın Riski');
      const pollutionLayer = buildPointLayer(L, mockHeatmapData, getPollutionColor, 'Kirlilik');
      const vegetationLayer = buildPointLayer(L, mockHeatmapData, getVegetationColor, 'NDVI');

      if (activeOverlays.fire) fireLayer.addTo(map);
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

      <div className="absolute top-24 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 w-64">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Harita Görünümü</h3>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => handleBaseMapChange('normal')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${
              baseMap === 'normal' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            Normal
          </button>

          <button
            onClick={() => handleBaseMapChange('satellite')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${
              baseMap === 'satellite' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            Uydu
          </button>
        </div>

        <h3 className="text-sm font-bold text-gray-700 mb-3">Katmanlar</h3>

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

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
            Yoğunluk
          </p>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
            <span className="text-[11px] text-gray-500 mr-2">Düşük</span>
            <span className="w-4 h-4 rounded-full" style={{ background: '#ef4444' }} />
            <span className="text-[11px] text-gray-500">Yüksek</span>
          </div>
        </div>
      </div>
    </div>
  );
}