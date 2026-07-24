'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Analytics from '@/components/Analytics';

export default function RegionDetail() {
  const { id } = useParams();
  const [regionData, setRegionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegion = async () => {
      try {
        const res = await fetch(`/api/analyze?id=${id}`);
        const data = await res.json();
        setRegionData(data);
      } catch (err) {
        console.error('Veri yuklenemedi:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRegion();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Yukleniyor...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <a href="/" className="text-primary-600 hover:underline text-sm">&#8592; Ana Sayfaya Don</a>
          <h1 className="text-xl font-bold text-gray-800 mt-1">Bolge Detay - #{id}</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {regionData ? (
          <Analytics data={regionData} />
        ) : (
          <div className="card text-center text-gray-500">Bolge verisi bulunamadi.</div>
        )}
      </div>
    </main>
  );
}
