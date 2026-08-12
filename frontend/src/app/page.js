'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Map from '@/components/Map';
import Toast from '@/components/Toast';

const POLL_INTERVAL_MS = 3000;

// Map bileşeni { geoJson, lat, lng, radius } gönderiyor;
// GeoJSON Feature geldiği durumda da çalışsın diye ikisini de karşılıyoruz.
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

  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Sayfa kapanırken açık kalan interval'i temizle (memory leak önlemi)
  useEffect(() => stopPolling, []);

  // Mutfaktan (Redis) görevin durumunu sor; analiz gerçekten bitene kadar bekle
  const startPolling = (id) => {
    stopPolling();

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyze?task_id=${id}`);
        const statusData = await res.json();

        if (statusData.status === 'completed') {
          stopPolling();
          setAnalysisResult(statusData.result);
          setLoading(false);
          setToast({
            type: 'success',
            title: 'Analiz Tamamlandı',
            message: statusData.result?.demo_mode
              ? 'Analiz tamamlandı, ancak uydu verisi alınamadığı için demo değerleri gösteriliyor.'
              : 'Bölge analizi başarıyla sonuçlandı. Detayları inceleyebilirsiniz.',
          });
        } else if (statusData.status === 'failed') {
          stopPolling();
          setLoading(false);
          setToast({
            type: 'danger',
            title: 'Analiz Hatası',
            message: statusData.error || 'Analiz tamamlanamadı. Lütfen tekrar deneyin.',
          });
        }
      } catch (err) {
        console.error('Durum sorgulama hatası:', err);
        stopPolling();
        setLoading(false);
        setToast({
          type: 'danger',
          title: 'Bağlantı Hatası',
          message: 'Analiz durumu sorgulanamadı. Lütfen tekrar deneyin.',
        });
      }
    }, POLL_INTERVAL_MS);
  };

  const handleAnalyze = async () => {
    if (!selectedRegion || loading) return;

    const coordinates = resolveCoordinates(selectedRegion);

    if (!coordinates) {
      setToast({
        type: 'danger',
        title: 'Geçersiz Bölge',
        message: 'Seçilen bölgeden koordinat okunamadı. Lütfen yeniden çizin.',
      });
      return;
    }

    setLoading(true);
    setAnalysisResult(null);
    setTaskId(null);

    // Analiz başladığında bilgi bildirimi gösteriyoruz
    setToast({
      type: 'info',
      title: 'Analiz Başlatıldı',
      message: 'Seçilen bölge için uydu verileri işleniyor, lütfen bekleyin...',
    });

    try {
      const payload = {
        start_points: [coordinates],
        end_points: [],
        buffer_meters: selectedRegion.radius || 1000,
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP hatası! Durum: ${res.status}`);
      }

      const data = await res.json();

      if (!data.task_id) {
        throw new Error('Görev numarası (task_id) alınamadı');
      }

      // Vezne sadece fişi verdi; analiz henüz bitmedi, sormaya başlıyoruz
      setTaskId(data.task_id);
      startPolling(data.task_id);
    } catch (err) {
      console.error('Analiz hatası:', err);
      setLoading(false);
      // Hata durumunda hata bildirimi gösteriyoruz
      setToast({
        type: 'danger',
        title: 'Analiz Hatası',
        message: 'Veriler işlenirken bir sorun oluştu. Lütfen tekrar deneyin.',
      });
    }
  };

  const handleDetail = () => {
    const coordinates = resolveCoordinates(selectedRegion);
    if (!coordinates) return;

    // task_id'yi de taşıyoruz ki detay sayfası aynı bölgeyi ikinci kez
    // analiz etmek yerine hazır sonucu okusun
    const params = new URLSearchParams({
      lat: String(coordinates.lat),
      lon: String(coordinates.lng),
    });

    if (taskId) {
      params.set('task_id', taskId);
    }

    router.push(`/region?${params.toString()}`);
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-gray-100">

      {/* Harita - Tam ekran */}

      <div className="absolute inset-0 z-0">
        <Map onRegionSelect={setSelectedRegion} />
      </div>

      {/* Üst Menü - Haritanın üzerinde yüzen bar */}

      <nav className="absolute top-0 left-0 right-0 z-[1000] h-20 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="h-full px-8 flex items-center justify-between">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-2xl font-bold">
                G
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                GeoMorphosis
              </h1>

              <p className="text-lg text-gray-500">
                Çevresel İzleme Platformu
              </p>
            </div>

          </div>

          <div className="flex items-center gap-6">

            <p className="text-xl text-gray-500 hidden md:block">
              Uydu Analiz Sistemi
            </p>

            <button
              onClick={() => setPanelOpen((prev) => !prev)}
              className="bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-black transition"
            >
              {panelOpen ? 'Paneli Gizle' : 'Paneli Göster'}
            </button>

          </div>

        </div>
      </nav>

      {/* Sağ panel - Haritanın üzerinde yüzen kart */}

      {panelOpen && (
        <div className="absolute top-28 right-4 z-[1000] w-full max-w-sm max-h-[calc(100vh-8rem)] overflow-y-auto">

          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6">

            <h2 className="text-3xl font-bold">
              Analizi Başlat
            </h2>

            {selectedRegion ? (
              <>
                <div className="bg-gray-50 rounded-2xl p-6">

                  <h3 className="text-xl font-semibold mb-4">
                    Seçilen koordinatlar
                  </h3>

                  <div className="space-y-4">

                    <div>
                      <p className="text-gray-500">
                        Enlem
                      </p>

                      <p className="text-2xl font-bold">
                        {resolveCoordinates(selectedRegion)?.lat.toFixed(4) ?? '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">
                        Boylam
                      </p>

                      <p className="text-2xl font-bold">
                        {resolveCoordinates(selectedRegion)?.lng.toFixed(4) ?? '-'}
                      </p>
                    </div>

                  </div>

                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {loading
                    ? 'Analiz yapılıyor...'
                    : 'AI Analizini Başlat'}
                </button>
              </>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-6 text-gray-500">
                Harita üzerinden bir bölge seçin.
              </div>
            )}

            {loading && taskId && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-blue-700 font-semibold animate-pulse">
                  Yapay zekâ bölgeyi işliyor...
                </p>
                <p className="text-gray-500 text-sm mt-2 break-all">
                  Fiş No: {taskId}
                </p>
              </div>
            )}

            {analysisResult && (
              <div>

                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">

                  <h3 className="font-bold text-green-700 text-lg">
                    ✓ Analiz tamamlandı
                  </h3>

                  <div className="mt-3 space-y-2 text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-500">NDVI skoru</span>
                      <span className="font-semibold">{analysisResult.ndvi_score}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">Yangın riski</span>
                      <span className="font-semibold">
                        {RISK_LABELS[analysisResult.fire_risk] ?? '-'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">Kirlilik</span>
                      <span className="font-semibold">
                        {RISK_LABELS[analysisResult.pollution_level] ?? '-'}
                      </span>
                    </div>
                  </div>

                  {analysisResult.demo_mode && (
                    <p className="text-amber-600 text-sm mt-3">
                      Uydu verisi alınamadı, demo değerleri gösteriliyor.
                    </p>
                  )}

                  {analysisResult.model_loaded === false && (
                    <p className="text-amber-600 text-sm mt-1">
                      Nesne tespit modeli yüklenemedi; risk değerleri yalnızca
                      NDVI değişimine dayanıyor.
                    </p>
                  )}

                </div>

                <button
                  onClick={handleDetail}
                  className="w-full mt-4 bg-gray-900 text-white py-5 rounded-2xl text-lg font-semibold hover:bg-black transition"
                >
                  Detaylı Analizi Aç
                </button>

              </div>
            )}

            <div className="bg-blue-50 rounded-2xl p-6">

              <h3 className="font-bold text-blue-700 text-lg">
                Bilgi
              </h3>

              <p className="text-gray-600 mt-3">
                Analiz sonuçları ayrı bir sayfada
                gösterilecektir.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* Toast Bildirim Alanı */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

    </main>
  );
}
