FROM node:22-slim

# 1. Ana çalışma dizinini ayarla
WORKDIR /app

# 2. Gerekli derleme araçlarını kur
RUN apk add --no-cache python3 make g++

# 3. Kök dizindeki bağımlılıkları kopyala ve kur
COPY package*.json ./
RUN npm install

# 4. Tüm monorepo kodunu içeri kopyala
COPY . .

# 5. Çalışma dizinini frontend klasörüne geçir!
WORKDIR /app/frontend

# 6. Prisma generate komutunu frontend içinde çalıştır
# (Artık otomatik olarak ./prisma/schema.prisma dosyasını bulacak)
RUN npx prisma generate

EXPOSE 3000

# 7. Frontend uygulamasını başlat
CMD ["npm", "run", "dev"]