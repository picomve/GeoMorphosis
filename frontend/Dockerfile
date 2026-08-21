FROM node:22-slim

WORKDIR /app

# 1. Gerekli araçları kur ve apt önbelleğini temizle (İmaj boyutunu küçültür)
RUN apt-get update && apt-get install -y python3 make g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# 2. Önce SADECE bağımlılık dosyalarını kopyala (Docker Cache için kritik)
# Not: Monorepo olduğu için kök dizindeki dosyalara ek olarak 
# workspace altındaki package.json'ları da buraya kopyalamak en idealidir,
# ancak şimdilik mevcut yapını bozmamak adına tüm dosyaları aşağıda kopyalayacağız.
COPY package.json pnpm-lock.yaml* ./

# 3. pnpm için Prisma ve SQLite güvenlik izinlerini ayarla
RUN npm pkg set pnpm.onlyBuiltDependencies='["@prisma/engines", "better-sqlite3", "prisma", "@prisma/adapter-better-sqlite3"]' --json

# 4. Bütün kodu kopyala (Monorepo olduğu için tüm workspace'in görünmesi gerekiyor)
COPY . .

# 5. Bağımlılıkları yükle
RUN pnpm install --prod=false

# 6. Prisma Client'ı oluştur
WORKDIR /app/frontend
RUN npx prisma generate

# 7. Ana dizine dön ve Build al (RAM canavarı Daemon kapatıldı)
WORKDIR /app
RUN npx turbo run build --filter=frontend --no-daemon

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
EXPOSE 3000

# 8. Başlatma komutu
CMD ["npx", "turbo", "run", "start", "--filter=frontend", "--no-daemon"]