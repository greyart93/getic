import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ticketId, notesText } = body

    if (!ticketId || !notesText || typeof notesText !== 'string' || !notesText.trim()) {
      return NextResponse.json(
        { error: 'ticketId and valid notesText are required' },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        ticketId: Number(ticketId),
        notesText: notesText.trim(),
      },
    })

    // Update ticket updatedAt in database
    await prisma.ticket.update({
      where: { id: Number(ticketId) },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')

    const notes = await prisma.note.findMany({
      where: ticketId ? { ticketId: Number(ticketId) } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('❌ Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}
