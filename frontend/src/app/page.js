'use client';

import { useState } from 'react';
import Map from '@/components/Map';
import Analytics from '@/components/Analytics';

export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!selectedRegion) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: selectedRegion }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Analiz hatasi:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">GeoMorphosis</h1>
          </div>
          <span className="text-sm text-gray-500">Cevresel Monitoring Platformu</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Harita Uzerinden Bolge Sec</h2>
              <Map onRegionSelect={setSelectedRegion} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Analiz Baslat</h2>
              {selectedRegion ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Secilen koordinatlar hazir.
                  </p>
                  <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full">
                    {loading ? 'Analiz yapiliyor...' : 'AI Analiz Baslat'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Harita uzerinden bir bolge secin.</p>
              )}
            </div>

            {analysisResult && (
              <div className="card">
                <Analytics data={analysisResult} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
