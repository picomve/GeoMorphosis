FROM node:22-slim

WORKDIR /app

RUN apk add --no-cache python3 make g++

# 1. BÜTÜN KODU kopyala ki monorepo'daki tüm package.json'lar görünsün
COPY . .

# 2. Şimdi ana dizinde install yap (tüm workspace'lerin bağımlılıkları kurulacak)
RUN npm install

# 3. Frontend dizinine geç ve Prisma'yı generate et
WORKDIR /app/frontend
RUN npx prisma generate

EXPOSE 3000

# GeoMorphosis Next.js projesini başlat (Eğer Turbopack kullanıyorsan komutuna --turbo ekleyebilirsin)
CMD ["npm", "run", "dev"]