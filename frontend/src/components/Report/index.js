'use client';

export default function Report({ data }) {
  const handleDownload = () => {
    const content = `
      GeoMorphosis Raporu
      ===================
      Bolge: ${data?.region_name || 'N/A'}
      Tarih: ${new Date().toLocaleString('tr-TR')}
      NDVI Skoru: ${data?.ndvi_score || 'N/A'}
      Yangin Riski: ${data?.fire_risk || 'N/A'}
      Kirlilik: ${data?.pollution_level || 'N/A'}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geopulse-rapor-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleDownload} className="btn-primary w-full">
      Rapor Indir
    </button>
  );
}
