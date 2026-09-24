//
// ─── GLOBAL NOTES API ───────────────────────────────────────────────────
//   POST /api/notes                      create a note ({ ticketId, notesText })
//   GET  /api/notes?ticketId=5           list notes (optionally filtered by ticket)
//
// NOTE: /api/tickets/[id]/notes does the same job scoped to one ticket —
// this route exists as the more general endpoint (two ways in, same table).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ticketId, notesText } = body

    // 👇 Manual validation (the project's only server-side check — Zod lives
    //    only in the UI form; a future TODO could unify both on Zod)
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

    // 👇 Second write: bump the ticket's updatedAt so "Last Updated" in the
    //    UI reflects the new note. @updatedAt only fires when the TICKET row
    //    itself changes — writing to a child note doesn't touch it, so we do
    //    it explicitly. Raw Date() again: client renders its own timezone.
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

// GET: with ?ticketId=5 returns one ticket's notes; without it, ALL notes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')

    const notes = await prisma.note.findMany({
      // 👇 undefined `where` = no filter — a neat Prisma idiom
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
