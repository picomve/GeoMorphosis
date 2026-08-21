FROM node:22-alpine

# 1. Ana çalışma dizinini ayarla
WORKDIR /app

# 2. Prisma ve diğer native eklentiler için derleme araçlarını kur
RUN apk add --no-cache python3 make g++

# 3. Node.js ile gelen corepack'i aktif edip pnpm'i etkinleştir
RUN corepack enable

# 4. BÜTÜN KODU kopyala (Tüm workspace ve package.json'ların görünmesi şart)
COPY . .

# 5. Ana dizinde install yap (Böylece Next.js dahil tüm bağımlılıklar birbirine bağlanır)
RUN pnpm install

# 6. Sadece Prisma'yı generate etmek için geçici olarak frontend klasörüne gir
WORKDIR /app/frontend
RUN npx prisma generate

# 7. Uygulamayı başlatmak için tekrar ana (root) dizine dön
WORKDIR /app

# 8. Railway için portu aç
EXPOSE 3000

# 9. Turborepo kullanarak ana dizinden frontend'i ayağa kaldır
CMD ["npx", "turbo", "run", "dev", "--filter=frontend"]