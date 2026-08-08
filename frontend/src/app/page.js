'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <-- Yönlendirme (Router) için bu eksikti, ekledik
import { Sun, Moon } from 'lucide-react';
import Map from '@/components/Map';
import Analytics from '@/components/Analytics';

export default function Home() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- GECE MODU AYARLARI BAŞLANGICI ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  // --- GECE MODU AYARLARI BİTİŞİ ---

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

  const handleDetail = () => {
    if (!selectedRegion) return;
    const lat = selectedRegion.lat;
    const lon = selectedRegion.lng || selectedRegion.lon;
    router.push(`/region?lat=${lat}&lon=${lon}`);
  };

  return (
    // dark:bg-gray-900 ile sayfanın arkaplanı karanlık temada siyah/lacivert olur
    <main className="min-h-screen transition-colors duration-300 dark:bg-gray-900">
      
      {/* Üst Menü */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">GeoMorphosis</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-300 hidden sm:block">
              Çevresel Monitoring Platformu
            </span>
            
            {/* GECE/GÜNDÜZ BUTONU */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm"
              title={isDarkMode ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Harita Üzerinden Bölge Seç</h2>
              
              {/* Haritaya isDarkMode bilgisini gönderiyoruz */}
              <Map onRegionSelect={setSelectedRegion} isDarkMode={isDarkMode} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Analiz Başlat</h2>
              {selectedRegion ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Seçilen koordinatlar hazır.
                  </p>
                  <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full">
                    {loading ? 'Analiz yapılıyor...' : 'AI Analiz Başlat'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Harita üzerinden bir bölge seçin.</p>
              )}
            </div>

            {analysisResult && (
              <div className="card space-y-3 dark:bg-gray-800 dark:border-gray-700">
                <Analytics data={analysisResult} />
                <button onClick={handleDetail} className="w-full bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors duration-200 font-medium text-sm">
                  Detaylı İncele
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}