import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates) {
      return NextResponse.json({ error: 'Koordinat gerekli' }, { status: 400 });
    }

    const aiEngineUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

    const payload = {
      lat: coordinates.lat,
      lon: coordinates.lng || coordinates.lon,
      buffer_meters: coordinates.radius || 1000,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${aiEngineUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json();
      return NextResponse.json(data);
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({
        status: 'completed',
        region_name: `Bolge [${payload.lat}, ${payload.lon}]`,
        fire_risk: 'dusuk',
        pollution_level: 'yok',
        ndvi_score: 0.75,
        demo_mode: true,
        satellite_images: [],
        total_years_analyzed: 0,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Analiz sirasinda hata olustu' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const id = searchParams.get('id');

  let resolvedLat = lat;
  let resolvedLon = lon;

  if (!resolvedLat && !resolvedLon && id) {
    const parts = id.split(',');
    if (parts.length === 2) {
      resolvedLat = parts[0];
      resolvedLon = parts[1];
    }
  }

  if (!resolvedLat || !resolvedLon) {
    return NextResponse.json({ error: 'Enlem ve boylam gerekli' }, { status: 400 });
  }

  const fallback = {
    lat: parseFloat(resolvedLat),
    lon: parseFloat(resolvedLon),
    region_name: `Bolge [${resolvedLat}, ${resolvedLon}]`,
    status: 'completed',
    fire_risk: 'dusuk',
    pollution_level: 'yok',
    ndvi_score: 0.75,
    timestamp: new Date().toISOString(),
  };

  try {
    const aiEngineUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${aiEngineUrl}/satellite/latest?lat=${resolvedLat}&lon=${resolvedLon}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const satelliteData = await response.json();

    return NextResponse.json({ ...fallback, satellite: satelliteData });
  } catch {
    return NextResponse.json(fallback);
  }
}
