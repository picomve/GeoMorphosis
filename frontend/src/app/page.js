'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Send, Info } from 'lucide-react';
import Map from '@/components/Map';
import Toast from '@/components/Toast';

export default function Home() {
  const router = useRouter();

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState(null);

  // --- HAKKIMIZDA PENCERESİ DURUMU ---
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // --- GECE MODU AYARLARI ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleAnalyze = async () => {
    if (!selectedRegion) return;

    setLoading(true);
    setToast({
      type: 'info',
      title: 'Analiz Başlatıldı',
      message: 'Seçilen bölge için uydu verileri işleniyor, lütfen bekleyin...'
    });

    try {
      let lat, lng;
      
      if (selectedRegion.type === 'Feature') {
        const coords = selectedRegion.geometry.coordinates[0][0]; 
        lng = coords[0];
        lat = coords[1];
      } else {
        lat = selectedRegion.lat;
        lng = selectedRegion.lng || selectedRegion.lon;
      }

      const payload = {
        start_points: [{ lat, lng }],
        end_points: [],
        buffer_meters: 1000,
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
      setAnalysisResult(data);
      
      setToast({
        type: 'success',
        title: 'Analiz Tamamlandı',
        message: 'Bölge analizi başarıyla sonuçlandı. Detayları inceleyebilirsiniz.'
      });
    } catch (err) {
      console.error('Analiz hatası:', err);
      setToast({
        type: 'danger',
        title: 'Analiz Hatası',
        message: 'Veriler işlenirken bir sorun oluştu. Lütfen tekrar deneyin.'
      });
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
    <main className="fixed inset-0 overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">

      {/* Harita - Tam ekran */}
      <div className="absolute inset-0 z-0">
        <Map onRegionSelect={setSelectedRegion} isDarkMode={isDarkMode} />
      </div>

      {/* Üst Menü */}
      <nav className="absolute top-0 left-0 right-0 z-[1000] h-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="h-full px-8 flex items-center justify-between">

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-2xl font-bold">G</span>
            </div>
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
              onClick={() => alert('Telegram botuna bağlanma işlemi başlatılacak!')}
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

      {/* Sağ panel - Haritanın üzerinde yüzen kart */}
      {panelOpen && (
        <div className="absolute top-28 right-4 z-[1000] w-full max-w-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6 transition-colors duration-300">

            <h2 className="text-3xl font-bold dark:text-white">Analizi Başlat</h2>

            {selectedRegion ? (
              <>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 transition-colors duration-300">
                  <h3 className="text-xl font-semibold mb-4 dark:text-white">Seçilen koordinatlar</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Enlem</p>
                      <p className="text-2xl font-bold dark:text-white">{selectedRegion.lat.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Boylam</p>
                      <p className="text-2xl font-bold dark:text-white">
                        {(selectedRegion.lng || selectedRegion.lon).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {loading ? 'Analiz yapılıyor...' : 'AI Analizini Başlat'}
                </button>
              </>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 text-gray-500 dark:text-gray-300 transition-colors duration-300">
                Harita üzerinden bir bölge seçin.
              </div>
            )}

            {analysisResult && (
              <div>
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-5 transition-colors duration-300">
                  <h3 className="font-bold text-green-700 dark:text-green-400 text-lg">✓ Analiz tamamlandı</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    Detaylı grafikler ve raporlar analiz ekranında görüntülenecektir.
                  </p>
                </div>
                <button
                  onClick={handleDetail}
                  className="w-full mt-4 bg-gray-900 dark:bg-gray-700 text-white py-5 rounded-2xl text-lg font-semibold hover:bg-black dark:hover:bg-gray-600 transition"
                >
                  Detaylı Analizi Aç
                </button>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-6 transition-colors duration-300">
              <h3 className="font-bold text-blue-700 dark:text-blue-400 text-lg">Bilgi</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-3">
                Analiz sonuçları ayrı bir sayfada gösterilecektir.
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

      {/* HAKKIMIZDA MODALI (AÇILIR PENCERE) */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-3xl overflow-hidden flex flex-col transition-colors duration-300 border border-transparent dark:border-gray-700">
            
            {/* Modal Başlığı */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="text-purple-600 dark:text-purple-400" size={28} />
                Hakkımızda
              </h3>
              <button 
                onClick={() => setIsAboutOpen(false)} 
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-2 rounded-full transition-colors text-xl font-extrabold"
              >
                ✕
              </button>
            </div>

            {/* Modal İçeriği (Tam Beyaz ve Kalın Yazılarla Netleştirildi) */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[60vh] space-y-8 leading-relaxed">
              
              <div>
                <h4 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">Gezegenimizin Yarınını Yapay Zekâ İle Şekillendiriyoruz</h4>
                <p className="text-gray-800 dark:text-white font-medium text-lg">GeoMorphosis, geleceğimizi tehdit eden çevresel değişimleri anlık ve hassas verilerle izlemek, doğayı korumak ve çevre kirliliğine karşı veri odaklı çözümler sunmak amacıyla geliştirilmiş yenilikçi bir web platformudur.</p>
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">Kuruluş Hikayemiz</h4>
                <p className="text-gray-800 dark:text-white font-medium text-lg mb-3">Her şey, doğaya duyarlı 10 genç ve araştırmacı zihnin ULUTEK Staj Programı kapsamında bir araya gelmesiyle başladı. Teknoloji ile doğayı koruma arzumuz, bir staj projesini kısa sürede büyük bir vizyona dönüştürdü. Ekibimizin ortak tutkusu; yapay zekâ ve coğrafi bilgi sistemlerini birleştirerek doğanın sesini herkese duyurabilmekti.</p>
                <p className="text-gray-800 dark:text-white font-medium text-lg">Bugün 10 kişilik dinamik ekibimizle, çevre kirliliğine dikkat çekmek ve gezegenimizi korumak için GeoMorphosis'i geliştirmeye devam ediyoruz.</p>
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">Ne Yapıyoruz?</h4>
                <p className="text-gray-800 dark:text-white font-medium text-lg mb-3">GeoMorphosis, kullanıcıların harita üzerinden seçtiği bölgelerdeki çevresel değişimleri yapay zekâ ile analiz eder:</p>
                <ul className="list-disc pl-5 space-y-3 text-gray-800 dark:text-white font-medium text-lg">
                  <li><strong className="font-extrabold dark:text-white">İnteraktif Harita Analizi:</strong> Yangın riskleri, çevre kirliliği, ağaç ve bitki örtüsündeki azalmaları yapay zekâ algoritmalarıyla yüksek doğrulukta tespit ediyoruz.</li>
                  <li><strong className="font-extrabold dark:text-white">Otomatik Bildirimler:</strong> Çevresel tehditleri ve ani değişimleri anında fark ederek kullanıcılara otomatik uyarılar gönderiyoruz.</li>
                  <li><strong className="font-extrabold dark:text-white">PDF Raporlama:</strong> Yapılan tüm analizleri istatistikler ve harita çıktılarıyla birleştirip indirilebilir detaylı PDF raporları haline getiriyoruz.</li>
                </ul>
              </div>

              {/* Alt Kutu İçerisindeki Yazılar */}
              <div className="bg-purple-50 dark:bg-purple-900/60 p-6 rounded-2xl border border-purple-100 dark:border-purple-500 shadow-inner">
                <h4 className="text-xl font-extrabold text-purple-900 dark:text-white mb-3">Çağrımız: Doğa Dostu Olun, Doğayı Koruyun!</h4>
                <p className="text-purple-900 dark:text-white font-medium text-lg mb-3">Çevre kirliliği ve iklim krizi sadece yarının değil, bugünün sorunudur. GeoMorphosis olarak temel amacımız; araştırmacılara, kurumlara ve doğaseverlere güvenilir veriler sunarak daha bilinçli adımlar atılmasını sağlamaktır.</p>
                <p className="text-purple-900 dark:text-white font-extrabold text-lg">Gelecek nesillere daha yaşanabilir bir dünya bırakmak bizim elimizde. Siz de doğa dostu olun, doğayı birlikte koruyalım!</p>
              </div>

            </div>

            {/* Modal Alt Kısım */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white font-extrabold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors shadow-sm"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}