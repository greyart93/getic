-- Join-by-credentials: public room code + optional scrypt password hash.
-- Order matters: add nullable -> backfill codes -> enforce NOT NULL.
ALTER TABLE "Organization" ADD COLUMN "joinCode" TEXT,
                    ADD COLUMN "joinPasswordHash" TEXT;

UPDATE "Organization"
SET "joinCode" = upper(substr(md5(random()::text || id::text), 1, 8))
WHERE "joinCode" IS NULL;

CREATE UNIQUE INDEX "Organization_joinCode_key" ON "Organization"("joinCode");
ALTER TABLE "Organization" ALTER COLUMN "joinCode" SET NOT NULL;
