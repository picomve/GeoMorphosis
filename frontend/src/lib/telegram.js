const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Prisma istemcisini yalnizca gercekten veritabanina gidilecegi zaman yukler.
 * Statik import, sadece sayisal chat id kullanan cagri yollarini da (ornegin
 * /api/analyze) @prisma/adapter-better-sqlite3'e ve DATABASE_URL'e bagimli
 * hale getiriyordu.
 */
async function getPrisma() {
  const mod = await import('@/lib/prisma');
  return mod.default;
}

/**
 * Verilen degeri Telegram chat id'sine cevirir.
 * Sayisal bir deger geldiyse dogrudan chat id kabul edilir,
 * aksi halde regions_analysis.user_id uzerinden telegram_chat_id cozulur.
 */
async function resolveChatId(chatIdOrUserId) {
  if (chatIdOrUserId === null || chatIdOrUserId === undefined || chatIdOrUserId === '') {
    return null;
  }

  if (/^-?\d+$/.test(String(chatIdOrUserId))) {
    return String(chatIdOrUserId);
  }

  try {
    const prisma = await getPrisma();
    const user = await prisma.regions_analysis.findUnique({
      where: { user_id: String(chatIdOrUserId) },
      select: { telegram_chat_id: true },
    });

    return user?.telegram_chat_id ?? null;
  } catch (error) {
    console.error('Telegram chat id cozumleme hatasi:', error);
    return null;
  }
}

export async function linkTelegramAccount(userId, chatId) {
  try {
    const prisma = await getPrisma();
    const updatedUser = await prisma.regions_analysis.update({
      where: {
        user_id: userId,
      },
      data: {
        telegram_chat_id: String(chatId),
      },
    });

    console.log('Telegram hesabı eşleştirildi:', updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Telegram hesabı eşleştirme hatası:', error);
    return null;
  }
}

/**
 * Telegram uzerinden bildirim gonderir.
 * @param {string|number} chatIdOrUserId Telegram chat id veya regions_analysis.user_id
 * @returns {Promise<boolean>} gonderim basarili ise true
 */
export async function sendTelegramNotification(chatIdOrUserId, message, title = 'Sistem Bildirimi') {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.includes('your_')) {
    console.warn('Telegram konfigürasyonu eksik, bildirim atlanıyor.');
    return false;
  }

  if (!message) {
    console.warn('Telegram mesaj icerigi bos, bildirim atlanıyor.');
    return false;
  }

  const chatId = await resolveChatId(chatIdOrUserId);

  if (!chatId) {
    console.warn('Telegram alicisi bulunamadi, bildirim atlanıyor.');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${title}\n\n${message}`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Telegram bildirim gönderme hatası:', response.status, detail);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telegram bildirim gönderme hatası:', error);
    return false;
  }
}
