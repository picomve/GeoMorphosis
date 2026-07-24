import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, region_id, notification_type } = body;

    if (!email || !region_id) {
      return NextResponse.json({ error: 'Email ve bolge ID gerekli' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Abonelik basarili',
      subscription: { email, region_id, notification_type },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Abonelik sirasinda hata olustu' }, { status: 500 });
  }
}
