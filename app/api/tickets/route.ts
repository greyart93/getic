import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 👇 Helper function to format dates consistently
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Create record first to get auto-incremented primary key id
    const created = await prisma.ticket.create({
      data: {
        customerName: body.customerName || body.customer_name,
        customerEmail: body.customerEmail || body.customer_email,
        subject: body.subject,
        description: body.description || 'Created from UI',
        status: 'OPEN',
      },
    })

    const ticketId = `TKT-${String(created.id).padStart(3, '0')}`

    const newTicket = await prisma.ticket.update({
      where: { id: created.id },
      data: { ticketId },
    })

    // 👇 Format dates before sending to frontend
    const formattedTicket = {
      ...newTicket,
      date: formatDate(newTicket.createdAt),
      createdAt: formatDateTime(newTicket.createdAt),
      updatedAt: formatDateTime(newTicket.updatedAt),
    }

    return NextResponse.json(formattedTicket, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    // 👇 Map through all tickets and format their dates
    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      date: formatDate(ticket.createdAt),
      createdAt: formatDateTime(ticket.createdAt),
      updatedAt: formatDateTime(ticket.updatedAt),
      notes: ticket.notes.map((note) => ({
        ...note,
        createdAt: formatDateTime(note.createdAt),
      })),
    }))

    return NextResponse.json(formattedTickets)
  } catch (error) {
    console.error('❌ Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

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
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting tickets:', error)
    return NextResponse.json({ error: 'Failed to delete tickets' }, { status: 500 })
  }
}