-- CreateTable
CREATE TABLE "Presence" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Presence_organizationId_lastSeenAt_idx" ON "Presence"("organizationId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
