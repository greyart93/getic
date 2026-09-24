//
// ─── TICKETS COLLECTION API ───────────────────────────────────────────────
//   POST   /api/tickets        create a ticket (auto-generates "TKT-XXX" code)
//   GET    /api/tickets        list ALL tickets, newest first, with nested notes
//   DELETE /api/tickets        bulk delete by { ids: [1, 2, 3] }
//
// NOTE ON DATES: everything is returned as raw ISO 8601 UTC strings. No
// toLocaleString() here — the server's timezone (Vercel = UTC) is NOT the
// user's. The client formats via lib/datetime.ts so every visitor sees their
// own local time. This was a real production bug; don't reintroduce it.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // STEP 1: create the row first, because we need the auto-incremented `id`
    // to build the human-friendly display code ("TKT-001", "TKT-002", ...)
    const created = await prisma.ticket.create({
      data: {
        customerName: body.customerName || body.customer_name,
        customerEmail: body.customerEmail || body.customer_email,
        subject: body.subject,
        description: body.description || 'Created from UI',
        status: 'OPEN', // 👈 every new ticket starts here (enum value)
      },
    })

    // STEP 2: pad the id to 3 digits and write the display code
    // (id 7 -> "TKT-007"). Two DB round-trips, but id generation is atomic.
    const ticketId = `TKT-${String(created.id).padStart(3, '0')}`

    const newTicket = await prisma.ticket.update({
      where: { id: created.id },
      data: { ticketId },
    })

    // 👇 Send raw dates; client formats them in its own timezone
    return NextResponse.json(newTicket, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

// GET: returns every ticket. Filtering/search/pagination all happen
// client-side in the TanStack table — a known scalability TODO.
export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' }, // newest first (the table can re-sort)
      include: {
        // 👇 JOIN: each ticket comes with its notes array nested inside it,
        //    so the view dialog never needs a second fetch
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    // 👇 Send raw dates; client formats them in its own timezone
    return NextResponse.json(tickets)
  } catch (error) {
    console.error('❌ Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

// DELETE: bulk delete used by the table's checkbox toolbar.
// Body: { ids: [1, 5, 9] }. deleteMany with `in` = one SQL statement.
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body

    if (Array.isArray(ids) && ids.length > 0) {
      await prisma.ticket.deleteMany({
        where: {
          id: { in: ids.map(Number) },
        },
      })
      // 👇 Notes need no cleanup here: onDelete: Cascade in schema.prisma
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting tickets:', error)
    return NextResponse.json({ error: 'Failed to delete tickets' }, { status: 500 })
  }
}