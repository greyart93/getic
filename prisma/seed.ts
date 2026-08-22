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

  // 3. Seed the tickets
  for (const ticket of ticketData) {
    // Remove the 'id' field so Prisma auto-generates it
    // Map the fields to match your Prisma schema exactly
    await prisma.ticket.create({
      data: {
        ticketId: ticket.ticketId,
        customerName: ticket.customerName,
        customerEmail: ticket.customerEmail,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status == "IN PROGRESS" ? "IN_PROGRESS" : ticket.status,
        // If your JSON has notes, you can uncomment this:
        // notes: ticket.notes ? {
        //   create: ticket.notes.map((note: any) => ({
        //     notesText: note.notesText,
        //     createdAt: new Date(note.createdAt)
        //   }))
        // } : undefined
      }
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