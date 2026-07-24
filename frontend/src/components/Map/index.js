'use client';

import { useEffect, useRef } from 'react';

export default function Map({ onRegionSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current).setView([39.0, 35.0], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      let drawnArea = null;

      map.on('click', (e) => {
        if (drawnArea) map.removeLayer(drawnArea);
        drawnArea = L.circle(e.latlng, { radius: 5000, color: '#22c55e' }).addTo(map);
        onRegionSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng, radius: 5000 });
      });

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onRegionSelect]);

  return <div ref={mapRef} id="map" className="rounded-xl" />;
}
