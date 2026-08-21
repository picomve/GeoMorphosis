FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 make g++

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]