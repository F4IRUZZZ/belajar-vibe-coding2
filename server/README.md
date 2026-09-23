# server

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Dev lokal (2 terminal, dari folder `server/`)

- Terminal 1 — API: `bun run index.ts` → http://localhost:3000
- Terminal 2 — Web: `bun run dev:web` → http://localhost:5501

`dev:web` (`depan.ts`) melayani frontend + mapping URL bersih
(`/transaksi` → `transaksi.html`, dst) persis seperti Cloudflare Pages,
tanpa rantai redirect 308. Live Server hanya untuk cek CSS per-file
(buka `.html` langsung) — test navigasi resmi via `dev:web`.

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
