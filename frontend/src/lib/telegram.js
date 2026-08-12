const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Prisma istemcisini yalnizca gercekten veritabanina gidilecegi zaman yukler.
 * Statik import, prisma'ya hic ihtiyaci olmayan cagri yollarini da (ornegin
 * /api/analyze) @prisma/adapter-better-sqlite3'e ve DATABASE_URL'e bagimli
 * hale getiriyordu; `next build` bu yuzden kiriliyordu.
 */
async function getPrisma() {
  const mod = await import('@/lib/prisma');
  return mod.default;
}

async function postMessage(token, chatId, message, title) {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `<b>${title}</b>\n\n${message}`,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram bildirim hatası:', error);
    return false;
  }
}

/** Belirli bir sohbete bildirim gonderir. */
export async function sendTelegramNotification(chatId, message, title = 'Sistem Bildirimi') {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId || token.includes('your_')) {
    console.warn('Telegram konfigürasyonu eksik, bildirim atlanıyor.');
    return false;
  }

  return postMessage(token, chatId, message, title);
}

/** Ortak .env sohbetine sistem bildirimi gonderir (alici parametresi gerekmez). */
export async function sendSystemTelegramNotification(message, title = 'Sistem Bildirimi') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.includes('your_')) {
    console.warn('Telegram konfigürasyonu eksik, bildirim atlanıyor.');
    return false;
  }

  return postMessage(token, chatId, message, title);
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
