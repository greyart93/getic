// import { prisma } from '../lib/prisma'

// async function main() {
//   console.log('🌱 Seeding database...')

//   // Delete existing data (optional: keeps your DB clean on re-seed)
//   await prisma.note.deleteMany()
//   await prisma.ticket.deleteMany()

//   // Create tickets
//   const created1 = await prisma.ticket.create({
//     data: {
//       customerName: 'art',
//       customerEmail: 'art@gmail.com',
//       subject: 'UI bug',
//       description: 'bg-color is outside of the border',
//       status: 'IN_PROGRESS',
//     },
//   })
//   const ticket1 = await prisma.ticket.update({
//     where: { id: created1.id },
//     data: { ticketId: `TKT-${String(created1.id).padStart(3, '0')}` },
//   })

//   const created2 = await prisma.ticket.create({
//     data: {
//       customerName: 'art',
//       customerEmail: 'art@gmail.com',
//       subject: 'form bug',
//       description: 'form is not submitting',
//       status: 'OPEN',
//     },
//   })
//   const ticket2 = await prisma.ticket.update({
//     where: { id: created2.id },
//     data: { ticketId: `TKT-${String(created2.id).padStart(3, '0')}` },
//   })

//   console.log(`✅ Created 2 tickets: ${ticket1.ticketId}, ${ticket2.ticketId}`)
// }

// main()
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })


// prisma/seed.ts
// import { PrismaClient } from '@prisma/client'
import {prisma} from '../lib/prisma';
// import * as fs from 'fs'
// import * as path from 'path';
import {ticketData} from './tickets';

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Read the JSON file
  // const filePath = path.join(process.cwd(), 'tickets.json')
  // const rawData = fs.readFileSync(filePath, 'utf-8')
  // const ticketData = JSON.parse(rawData)


  console.log(`📄 Found ${ticketData.length} tickets in JSON file.`)

  // 2. Clear existing data (optional - to avoid duplicates)
  // await prisma.note.deleteMany()
  // await prisma.ticket.deleteMany()
  // console.log('🧹 Cleared existing tickets and notes.')

  // 3. Ensure the seed org exists (all seeded tickets live in this room)
  const org = await prisma.organization.upsert({
    where: { slug: 'seed-org' },
    update: {},
    create: {
      id: 'org_seed',
      name: 'Getic Demo Org',
      slug: 'seed-org',
      joinCode: 'DEMO0001',
    },
  })
  console.log(`Using organization: ${org.name} (${org.id})`)

  // 4. Seed the tickets (each row stamped with the seed org - NOT NULL).
  //    upsert on ticketId = re-runnable: rows already seeded (unique ticketId)
  //    are updated in place instead of crashing with P2002.
  for (const ticket of ticketData) {
    const data = {
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status == "IN PROGRESS" ? "IN_PROGRESS" : ticket.status,
      organizationId: org.id,
    }
    await prisma.ticket.upsert({
      where: { ticketId: ticket.ticketId },
      update: data,
      create: {
        ticketId: ticket.ticketId,
        ...data,
      },
    })
  }

  console.log(`✅ Successfully seeded ${ticketData.length} tickets!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })