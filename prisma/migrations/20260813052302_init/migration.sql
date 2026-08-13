-- CreateEnum
CREATE TYPE "Status" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "Tickets" (
    "id" SERIAL NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "Subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'OPEN',
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notes" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "notes_text" TEXT NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tickets_ticket_id_key" ON "Tickets"("ticket_id");

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
