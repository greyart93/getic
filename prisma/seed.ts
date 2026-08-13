import { prisma } from '../lib/prisma'

async function main() {
  console.log('🌱 Seeding database...')

  // Delete existing data (optional: keeps your DB clean on re-seed)
  await prisma.note.deleteMany()
  await prisma.ticket.deleteMany()

  // Create tickets
  const created1 = await prisma.ticket.create({
    data: {
      customerName: 'art',
      customerEmail: 'art@gmail.com',
      subject: 'UI bug',
      description: 'bg-color is outside of the border',
      status: 'IN_PROGRESS',
    },
  })
  const ticket1 = await prisma.ticket.update({
    where: { id: created1.id },
    data: { ticketId: `TKT-${String(created1.id).padStart(3, '0')}` },
  })

  const created2 = await prisma.ticket.create({
    data: {
      customerName: 'art',
      customerEmail: 'art@gmail.com',
      subject: 'form bug',
      description: 'form is not submitting',
      status: 'OPEN',
    },
  })
  const ticket2 = await prisma.ticket.update({
    where: { id: created2.id },
    data: { ticketId: `TKT-${String(created2.id).padStart(3, '0')}` },
  })

  console.log(`✅ Created 2 tickets: ${ticket1.ticketId}, ${ticket2.ticketId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })