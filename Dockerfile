# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

# Volume para persistir dados (mapas, projetos, usuários)
VOLUME /root/.mindflow-data

CMD ["npx", "tsx", "server/index.ts"]
