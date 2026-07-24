const cron = require('node-cron');

console.log('Worker baslatildi - 2 saatte bir taranacak');

cron.schedule('0 */2 * * *', () => {
  console.log(`[${new Date().toISOString()}] Tarama baslatiliyor...`);
});
