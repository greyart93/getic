//
// ─── PRISMA CLIENT (SINGLETON) ──────────────────────────────────────────────
// The ONE database connection used by every API route. Import it as:
//   import { prisma } from '@/lib/prisma'
//
// WHY A SINGLETON? In dev, Next.js hot-reloads modules on every file save.
// Without this pattern each reload would create a fresh PrismaClient (and a
// fresh connection pool), quickly exhausting Postgres' connection limit.
// The fix: stash the client on globalThis so hot reloads reuse the same one.
// In production (Vercel serverless) each lambda is a single cold process, so
// the global isn't needed there — one client per lambda instance is correct.

// 👇 Loads .env so DATABASE_URL is available locally (Vercel injects env vars itself)
import "dotenv/config";
// 👇 Generated types come from app/generated/prisma (custom output set in schema.prisma).
//    Regenerate them after any schema change with: npx prisma generate
import { PrismaClient } from "../app/generated/prisma/client";
// 👇 Prisma 7 style: a DRIVER ADAPTER instead of the built-in query engine.
//    PrismaPg wraps node-postgres (pg) and talks to Postgres directly over a
//    plain connection string — smaller bundle, works well on serverless/edge.
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
// 👇 Reuse the cached client if it exists (dev hot reload), otherwise create one
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
// 👇 Only cache outside production — serverless instances shouldn't share state
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
