# Backend Fase B: image Bun ramping untuk Koyeb (gratis, tanpa kartu).
# Koyeb build otomatis dari GitHub saat Dockerfile ini ada di root.
# PORT diisi Koyeb saat jalan (index.ts sudah baca process.env.PORT).
FROM oven/bun:1 AS base
WORKDIR /app

# Install dulu (cache-friendly): dep berubah jarang, kode sering.
COPY server/package.json server/bun.lock ./
RUN bun install --production

# Baru salin kode server.
COPY server/index.ts ./index.ts
COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json

ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
