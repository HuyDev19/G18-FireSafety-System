FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
