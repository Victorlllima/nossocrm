FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
