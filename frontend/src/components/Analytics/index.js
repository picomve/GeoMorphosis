'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const ACCENT = {
  ndvi: '#2F6F52',
  fire: '#EF4444',
  pollution: '#3B82F6',
};

const RISK_LABELS = { yok: 'Yok', dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek' };
const RISK_PERCENT = { yok: 4, dusuk: 28, orta: 58, yuksek: 90 };

function normalizeRisk(value) {
  if (!value) return 'yok';
  return value.toLowerCase();
}

function KpiCard({ label, value, sublabel, accent }) {
  return (
    <div className="relative bg-white border border-[#E2E4E8] rounded-lg p-5 overflow-hidden transition-shadow hover:shadow-sm">
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: accent }}
      />
      <p className="text-[11px] tracking-[0.12em] uppercase text-[#6B7280] mb-3">
        {label}
      </p>
      <p className="font-data text-3xl text-[#1C2128] tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-[#9CA3AF] mt-2">{sublabel}</p>
    </div>
  );
}

function RiskBar({ percent, accent }) {
  return (
    <div className="w-full h-2 bg-[#F0F1F3] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${percent}%`, backgroundColor: accent }}
      />
    </div>
  );
}

// --- Ortak tooltip kabuğu: her iki grafik için de aynı görünüm ---
function TooltipShell({ children }) {
  return (
    <div className="bg-white border border-[#E2E4E8] rounded-md shadow-md px-3 py-2 text-xs">
      {children}
    </div>
  );
}

function NdviTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <TooltipShell>
      <p className="text-[#6B7280] mb-1">{label}</p>
      <p className="font-data text-sm font-semibold text-[#2F6F52] tabular-nums">
        {payload[0].value.toFixed(2)}
      </p>
    </TooltipShell>
  );
}

function DistributionTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  return (
    <TooltipShell>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-[#1C2128] font-medium">{item.name}</span>
      </div>
      <p className="font-data text-sm font-semibold text-[#1C2128] mt-1 tabular-nums">
        %{item.value}
      </p>
    </TooltipShell>
  );
}

export default function Analytics({ data }) {
  if (!data) return null;

  const ndviHistory = [
    { ay: 'Oca', deger: 0.42 },
    { ay: 'Şub', deger: 0.48 },
    { ay: 'Mar', deger: 0.55 },
    { ay: 'Nis', deger: 0.63 },
    { ay: 'May', deger: data.ndvi_score ?? 0.75 },
  ];

  const currentRisk = normalizeRisk(data.fire_risk);
  const currentPollution = normalizeRisk(data.pollution_level);

  const ndviPercent = Math.round((data.ndvi_score ?? 0) * 100);
  const firePercent = RISK_PERCENT[currentRisk];
  const pollutionPercent = RISK_PERCENT[currentPollution];
  const total = ndviPercent + firePercent + pollutionPercent || 1;

  const aiData = [
    { ad: 'Bitki Örtüsü', deger: Math.round((ndviPercent / total) * 100) },
    { ad: 'Yangın Riski', deger: Math.round((firePercent / total) * 100) },
    { ad: 'Kirlilik', deger: Math.round((pollutionPercent / total) * 100) },
  ];

  const PIE_COLORS = [ACCENT.ndvi, ACCENT.fire, ACCENT.pollution];

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 border-b border-[#E2E4E8]">
        <div>
          <p className="text-[11px] tracking-[0.15em] uppercase text-[#6B7280] mb-1">
            Bölge Analizi
          </p>
          <h1 className="text-xl font-semibold text-[#1C2128] tracking-tight">
            GeoMorphosis Analiz Paneli
          </h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#EAF4EF] border border-[#2F6F52]/20 w-fit">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2F6F52] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2F6F52]" />
          </span>
          <span className="text-[11px] tracking-wide text-[#2F6F52] font-medium uppercase">
            {data.status ?? 'Tamamlandı'}
          </span>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="NDVI Skoru"
          value={data.ndvi_score ?? '0.00'}
          sublabel="Bitki örtüsü yoğunluğu"
          accent={ACCENT.ndvi}
        />
        <KpiCard
          label="Yangın Riski"
          value={RISK_LABELS[currentRisk]}
          sublabel="Risk seviyesi"
          accent={ACCENT.fire}
        />
        <KpiCard
          label="Kirlilik"
          value={RISK_LABELS[currentPollution]}
          sublabel="Çevresel etki"
          accent={ACCENT.pollution}
        />
        <KpiCard
          label="Koordinat"
          value={`${(data.lat ?? 0).toFixed(2)}, ${(data.lon ?? 0).toFixed(2)}`}
          sublabel={data.region_name ?? 'Analiz alanı'}
          accent="#9CA3AF"
        />
      </div>

      {/* NDVI Grafiği */}
      <div className="bg-white border border-[#E2E4E8] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] tracking-[0.12em] uppercase text-[#6B7280]">
            NDVI Değişim Analizi
          </p>
          <span className="font-data text-sm text-[#2F6F52] font-medium tabular-nums">
            {data.ndvi_score}
          </span>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ndviHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F6F52" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#2F6F52" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" vertical={false} />

              <XAxis
                dataKey="ay"
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: '#E2E4E8' }}
                tickLine={false}
              />

              <YAxis
                domain={[0, 1]}
                stroke="#9CA3AF"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<NdviTooltip />} cursor={{ stroke: '#2F6F52', strokeDasharray: '3 3', strokeWidth: 1 }} />

              <Area
                type="monotone"
                dataKey="deger"
                stroke="#2F6F52"
                strokeWidth={2}
                fill="url(#ndviGradient)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#2F6F52' }}
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Göstergeleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E2E4E8] rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] tracking-[0.12em] uppercase text-[#6B7280]">
              Yangın Riski
            </p>
            <span className="text-sm font-medium" style={{ color: ACCENT.fire }}>
              {RISK_LABELS[currentRisk]}
            </span>
          </div>
          <RiskBar percent={RISK_PERCENT[currentRisk]} accent={ACCENT.fire} />
        </div>

        <div className="bg-white border border-[#E2E4E8] rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] tracking-[0.12em] uppercase text-[#6B7280]">
              Kirlilik Seviyesi
            </p>
            <span className="text-sm font-medium" style={{ color: ACCENT.pollution }}>
              {RISK_LABELS[currentPollution]}
            </span>
          </div>
          <RiskBar percent={RISK_PERCENT[currentPollution]} accent={ACCENT.pollution} />
        </div>
      </div>

      {/* Yapay Zekâ Dağılımı */}
      <div className="bg-white border border-[#E2E4E8] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] tracking-[0.12em] uppercase text-[#6B7280]">
            Yapay Zekâ Tespit Dağılımı
          </p>
          <div className="flex items-center gap-1.5">
            {['↻', '⚙', '↓'].map((icon) => (
              <span
                key={icon}
                className="w-6 h-6 rounded-full bg-[#2F6F52] text-white text-[11px] flex items-center justify-center"
              >
                {icon}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[15px] text-[#374151] leading-relaxed mb-8 max-w-xl">
          Bu bölgede yapılan analizde, tespit edilen etkenlerin{' '}
          <span className="font-semibold text-[#1C2128]">%{aiData[0].deger}'i bitki örtüsü</span>,{' '}
          <span className="font-semibold text-[#1C2128]">%{aiData[1].deger}'i yangın riski</span>{' '}
          ve <span className="font-semibold text-[#1C2128]">%{aiData[2].deger}'i kirlilik</span>{' '}
          kaynaklı unsurlara işaret ediyor.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          {/* Sol: lejant grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {aiData.map((item, index) => (
              <div key={item.ad}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[index] }}
                  />
                  <span className="text-[13px] text-[#4B5563]">{item.ad}</span>
                </div>
                <p
                  className="font-data text-2xl font-bold tabular-nums"
                  style={{ color: PIE_COLORS[index] }}
                >
                  %{item.deger}
                </p>
              </div>
            ))}
          </div>

          {/* Sağ: etiketsiz donut */}
          <div className="w-[220px] h-[220px] mx-auto lg:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aiData}
                  dataKey="deger"
                  nameKey="ad"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  animationDuration={700}
                >
                  {aiData.map((entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<DistributionTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-[11px] text-[#9CA3AF] mt-8 pt-4 border-t border-[#F0F1F3]">
          Analiz tarihi:{' '}
          {data.timestamp ? new Date(data.timestamp).toLocaleString('tr-TR') : '—'} · Bu
          oranlar NDVI, yangın ve kirlilik risk modeline dayanmaktadır.
        </p>
      </div>
    </div>
  );
}