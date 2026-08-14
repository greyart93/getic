import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { notesText } = body

    if (!notesText || typeof notesText !== 'string' || !notesText.trim()) {
      return NextResponse.json(
        { error: 'Note text is required' },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        ticketId: Number(id),
        notesText: notesText.trim(),
      },
    })

    await prisma.ticket.update({
      where: { id: Number(id) },
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const notes = await prisma.note.findMany({
      where: { ticketId: Number(id) },
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
