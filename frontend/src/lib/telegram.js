// 1. EKSİK OLAN PRISMA IMPORTU EKLENDİ
import prisma from './prisma'; 

// Ana bildirim gönderme fonksiyonu
export async function sendTelegramNotification(chatId, message, title = 'Sistem Bildirimi') {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // Diğer sayfalardaki kullanımların hata vermemesi için akıllı parametre kontrolü
  let finalChatId = chatId;
  let finalMessage = message;
  let finalTitle = title;

  // Eğer chatId gönderilmemişse (sadece mesaj ve başlık gönderilmişse)
  if (!message) {
    finalChatId = process.env.TELEGRAM_CHAT_ID;
    finalMessage = chatId; 
    finalTitle = title || 'Sistem Bildirimi';
  }

  if (!token || !finalChatId || token.includes('your_')) {
    console.warn('Telegram konfigürasyonu eksik, bildirim atlanıyor.');
    return false;
  }

  // EKSİK OLAN TELEGRAM API GÖNDERİM KODU EKLENDİ
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: finalChatId,
        text: `*${finalTitle}*\n\n${finalMessage}`,
        parse_mode: 'Markdown'
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Telegram gönderim hatası:', error);
    return false;
  }
}

// Telegram hesabını veritabanına bağlama fonksiyonu
export async function linkTelegramAccount(userId, chatId) {
  try {
    const updatedUser = await prisma.regions_analysis.update({
      where: { user_id: userId },
      data: { telegram_chat_id: String(chatId) },
    });

    console.log("Telegram hesabı eşleştirildi:", updatedUser);
    return updatedUser;
  } catch (error) {
    console.error("Telegram hesabı eşleştirme hatası:", error);
    return null;
  }
}

// 2. ÇAKIŞMA YARATAN İKİNCİ FONKSİYONUN ADI DEĞİŞTİRİLDİ
export async function sendTelegramNotificationToUser(userId, message, title = 'Sistem Bildirimi') {
  try {
    const user = await prisma.regions_analysis.findUnique({
      where: { user_id: userId },
      select: { telegram_chat_id: true },
    });

    // Kullanıcı bulunduysa asıl mesaj gönderme fonksiyonunu tetikle
    if (user && user.telegram_chat_id) {
      return await sendTelegramNotification(user.telegram_chat_id, message, title);
    }
    return false;
  } catch (error) {
    console.error("Telegram bildirim gönderme hatası:", error);
    return null;
  }
}