FROM node:22-slim

WORKDIR /app

# Derleme araçlarını kur (SQLite ve Prisma için şart)
RUN apt-get update && apt-get install -y python3 make g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Tüm projeyi içeri al
COPY . .

# Tertemiz, standart NPM kurulumu (--legacy-peer-deps kriz anlarında bağımlılık çakışmalarını ezer geçer)
RUN npm install --legacy-peer-deps

# Prisma'yı generate et
WORKDIR /app/frontend
RUN npx prisma generate

# Ana dizine dön ve build al
WORKDIR /app
RUN npx turbo run build --filter=frontend --no-daemon

# Port ayarları
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
EXPOSE 3000

# Uygulamayı başlat
CMD ["npx", "turbo", "run", "start", "--filter=frontend", "--no-daemon"]