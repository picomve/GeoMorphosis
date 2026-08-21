FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++

RUN corepack enable

COPY . .

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