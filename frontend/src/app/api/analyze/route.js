import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates) {
      return NextResponse.json({ error: 'Koordinat gerekli' }, { status: 400 });
    }

    const aiEngineUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

    const response = await fetch(`${aiEngineUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Analiz sirasinda hata olustu' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
  }

  return NextResponse.json({
    id,
    region_name: 'Ornek Bolge',
    status: 'completed',
    fire_risk: 'dusuk',
    pollution_level: 'yok',
    ndvi_score: 0.75,
    timestamp: new Date().toISOString(),
  });
}
