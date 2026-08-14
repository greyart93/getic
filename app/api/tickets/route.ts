import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json(newTicket, { status: 201 })
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
    return NextResponse.json(tickets)
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