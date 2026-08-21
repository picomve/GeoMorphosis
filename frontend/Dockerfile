FROM node:22-slim

# 1. Ana çalışma dizinini ayarla
WORKDIR /app

# 2. Prisma ve diğer native eklentiler için derleme araçlarını kur
RUN apt-get update && apt-get install -y python3 make g++

# 3. Node.js ile gelen corepack'i aktif edip pnpm'i etkinleştir
RUN corepack enable

# 4. BÜTÜN KODU kopyala (Tüm workspace ve package.json'ların görünmesi şart)
COPY . .

# 5. Ana dizinde install yap (Böylece Next.js dahil tüm bağımlılıklar birbirine bağlanır)
RUN pnpm install

# 6. Sadece Prisma'yı generate etmek için geçici olarak frontend klasörüne gir
WORKDIR /app/frontend
RUN npx prisma generate

# 7. İşlemler için tekrar ana (root) dizine dön
WORKDIR /app

# YENİ: 8. Projeyi canlı ortam (production) için optimize ederek derle
RUN npx turbo run build --filter=frontend

# 9. Railway için portu aç
EXPOSE 3000

# GÜNCELLENDİ: 10. Geliştirme (dev) modu yerine Production sunucusunu başlat!
CMD ["npx", "turbo", "run", "start", "--filter=frontend"]