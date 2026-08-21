FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++

RUN corepack enable

COPY . .

# 4. BÜTÜN KODU kopyala (Tüm workspace ve package.json'ların görünmesi şart)
COPY . .

# YENİ: pnpm için Prisma ve SQLite scriptlerine güvenlik izni (beyaz liste) ekle
RUN npm pkg set pnpm.onlyBuiltDependencies='["@prisma/engines", "better-sqlite3", "prisma", "@prisma/adapter-better-sqlite3"]' --json

# 5. Ana dizinde install yap
RUN pnpm install --prod=false

# Dev bağımlılıklarının atlanmaması için production uyarısını eziyoruz
RUN pnpm install --prod=false

WORKDIR /app/frontend
RUN npx prisma generate

WORKDIR /app

# YENİ: RAM canavarı Daemon kapatıldı
RUN npx turbo run build --filter=frontend --no-daemon

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
EXPOSE 3000

# YENİ: Başlatma komutunda da Daemon kapatıldı
CMD ["npx", "turbo", "run", "start", "--filter=frontend", "--no-daemon"]