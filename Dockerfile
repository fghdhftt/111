# Multi-stage build for Bitrix24 Counterparty Check app

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install --workspace shared --workspace backend --workspace frontend

COPY shared ./shared
COPY backend ./backend
COPY frontend ./frontend

RUN npm run build -w shared && npm run build -w frontend && npm run build -w backend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm install --omit=dev --workspace shared --workspace backend

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
