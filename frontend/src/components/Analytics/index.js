'use client';

export default function Analytics({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Analiz Sonuclari</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Bitki Ortusu (NDVI)</p>
          <p className="text-2xl font-bold text-green-700">{data.ndvi_score ?? 'N/A'}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-red-600 font-medium">Yangin Riski</p>
          <p className="text-2xl font-bold text-red-700">{data.fire_risk ?? 'N/A'}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-xs text-yellow-600 font-medium">Kirlilik Seviyesi</p>
          <p className="text-2xl font-bold text-yellow-700">{data.pollution_level ?? 'N/A'}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Bolge</p>
          <p className="text-sm font-bold text-blue-700">{data.region_name ?? 'N/A'}</p>
        </div>
      </div>

      {data.timestamp && (
        <p className="text-xs text-gray-400">Son guncelleme: {new Date(data.timestamp).toLocaleString('tr-TR')}</p>
      )}
    </div>
  );
}
