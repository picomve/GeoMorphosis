"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Send, Info } from 'lucide-react';
import Map from '@/components/Map';
import Toast from '@/components/Toast';
import { getUserId } from '@/lib/userId';

const POLL_INTERVAL_MS = 3000;

function resolveCoordinates(region) {
  if (!region) return null;

  if (typeof region.lat === 'number') {
    const lng = region.lng ?? region.lon;
    if (typeof lng === 'number') return { lat: region.lat, lng };
  }

  const coords = region.geoJson?.geometry?.coordinates?.[0]?.[0]
    ?? region.geometry?.coordinates?.[0]?.[0];

  if (Array.isArray(coords) && coords.length >= 2) {
    return { lat: coords[1], lng: coords[0] };
  }

  return null;
}

const RISK_LABELS = {
  yok: 'Yok',
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek',
};

export default function Home() {
  const router = useRouter();

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (id) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyze?task_id=${id}`);
        const statusData = await res.json();

        if (statusData.status === 'completed') {
          stopPolling();
          setAnalysisResult(statusData.result || statusData);
          setLoading(false);
          setToast({ type: 'success', title: 'Analiz Tamamlandı', message: 'Bölge analizi başarıyla sonuçlandı.' });
        } else if (statusData.status === 'failed') {
          stopPolling();
          setLoading(false);
          setToast({ type: 'danger', title: 'Analiz Hatası', message: statusData.error || 'Analiz tamamlanamadı.' });
        }
      } catch (err) {
        console.error('Durum sorgulama hatası:', err);
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const handleAnalyze = async () => {
    if (!selectedRegion || loading) return;
    const coordinates = resolveCoordinates(selectedRegion);
    if (!coordinates) {
      setToast({ type: 'danger', title: 'Geçersiz Bölge', message: 'Seçilen bölgeden koordinat okunamadı.' });
      return;
    }

    setLoading(true);
    setAnalysisResult(null);
    setTaskId(null);
    setToast({ type: 'info', title: 'Analiz Başlatıldı', message: 'Seçilen bölge için uydu verileri işleniyor...' });

    try {
      const payload = {
        start_points: [coordinates],
        end_points: [],
        buffer_meters: selectedRegion.radius || 1000,
        user_id: getUserId(), // Kullanıcı kimliğini gönderiyoruz
      };

      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP hatası! Durum: ${res.status}`);
      const data = await res.json();
      if (!data.task_id) throw new Error('Görev numarası (task_id) alınamadı');
      setTaskId(data.task_id);
      startPolling(data.task_id);
    } catch (err) {
      console.error('Analiz hatası:', err);
      setLoading(false);
      setToast({ type: 'danger', title: 'Analiz Hatası', message: 'Veriler işlenirken bir sorun oluştu.' });
    }
  };

  const handleDetail = () => {
    const coordinates = resolveCoordinates(selectedRegion);
    if (!coordinates) return;
    const params = new URLSearchParams({ lat: String(coordinates.lat), lon: String(coordinates.lng) });
    if (taskId) params.set('task_id', taskId);
    router.push(`/region?${params.toString()}`);
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="absolute inset-0 z-0">
        <Map onRegionSelect={setSelectedRegion} isDarkMode={isDarkMode} />
      </div>

      <nav className="absolute top-0 left-0 right-0 z-[1000] h-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="h-full px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md"><span className="text-white text-2xl font-bold">G</span></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GeoMorphosis</h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 hidden sm:block">Çevresel İzleme Platformu</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <p className="text-xl text-gray-500 dark:text-gray-400 hidden lg:block pr-4">Uydu Analiz Sistemi</p>

            {/* HAKKIMIZDA BUTONU */}
            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-2 p-2.5 rounded-full md:rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800/50 transition shadow-sm border border-purple-100 dark:border-purple-800"
              title="Hakkımızda"
            >
              <Info size={20} />
              <span className="hidden md:block text-sm font-bold pr-1">Hakkımızda</span>
            </button>

            {/* TELEGRAM BOTU BUTONU */}
            <button
              onClick={() => {
                const userId = getUserId();
                window.open(`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${userId}`, '_blank');
              }}
              className="flex items-center gap-2 p-2.5 rounded-full md:rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition shadow-sm border border-blue-100 dark:border-blue-800"
              title="Telegram Bildirimlerini Aç"
            >
              <Send size={20} />
              <span className="hidden md:block text-sm font-bold pr-1">Telegram</span>
            </button>

            {/* GECE/GÜNDÜZ BUTONU */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm"
              title={isDarkMode ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* PANEL GİZLE/GÖSTER BUTONU */}
            <button
              onClick={() => setPanelOpen((prev) => !prev)}
              className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black dark:hover:bg-gray-600 transition"
            >
              {panelOpen ? 'Gizle' : 'Göster'}
            </button>
          </div>
        </div>
      </nav>

      {panelOpen && (
        <div className="absolute top-28 right-4 z-[1000] w-full max-w-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6 transition-colors duration-300">
            <h2 className="text-3xl font-bold dark:text-white">Analizi Başlat</h2>

            {selectedRegion ? (
              <>
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Seçilen Alan / Koordinatlar</h3>
                  <pre className="text-sm text-gray-600 dark:text-gray-300">{JSON.stringify(resolveCoordinates(selectedRegion), null, 2)}</pre>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleAnalyze} disabled={loading} className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold">Analiz Başlat</button>
                  <button onClick={handleDetail} className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl py-3 font-semibold">Detay</button>
                </div>
              </>
            ) : (
              <p>Harita üzerinde bir bölge seçin veya çizin.</p>
            )}
          </div>
        </div>
      )}

      {loading && taskId && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
            <p className="text-blue-700 dark:text-blue-400 font-semibold animate-pulse">Yapay zekâ bölgeyi işliyor...</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 break-all">Fiş No: {taskId}</p>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="absolute bottom-8 right-4 z-[1000] w-full max-w-sm">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-5">
            <h3 className="font-bold text-green-700 dark:text-green-400 text-lg">✓ Analiz tamamlandı</h3>
            <div className="mt-3 space-y-2 text-gray-700 dark:text-gray-200">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">NDVI skoru</span><span className="font-semibold">{analysisResult.ndvi_score}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Yangın riski</span><span className="font-semibold">{RISK_LABELS[analysisResult.fire_risk] ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Kirlilik</span><span className="font-semibold">{RISK_LABELS[analysisResult.pollution_level] ?? '-'}</span></div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </main>
  );
}
