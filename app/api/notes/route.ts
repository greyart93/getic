//
// === GLOBAL NOTES API ====================================================
//   POST /api/notes                      create a note ({ ticketId, notesText })
//   GET  /api/notes?ticketId=5           list notes (optionally filtered by ticket)
//
// NOTE: /api/tickets/[id]/notes does the same job scoped to one ticket -
// this route exists as the more general endpoint (two ways in, same table).
//
// -- TENANCY: notes hang off tickets, so scoping goes through the PARENT
//    ticket's organizationId. Writes assert the ticket belongs to the active
//    org BEFORE inserting (ticketId from the body is never trusted); reads
//    join through the org's tickets so another company's notes cannot leak.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgUser } from '@/lib/rbac'

export async function POST(request: Request) {
  // >> TENANT GATE: signed-in member of the active organization
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const body = await request.json()
    const { ticketId, notesText } = body

    // >> Manual validation (the project's only server-side check - Zod lives
    //    only in the UI form; a future TODO could unify both on Zod)
    if (!ticketId || !notesText || typeof notesText !== 'string' || !notesText.trim()) {
      return NextResponse.json(
        { error: 'ticketId and valid notesText are required' },
        { status: 400 }
      )
    }

    // >> TENANT CHECK: the ticket must belong to the ACTIVE org. A crafted
    //    body pointing at another company's ticketId resolves to null and
    //    gets a uniform 404 (never confirm foreign ids exist).
    const ticket = await prisma.ticket.findFirst({
      where: { id: Number(ticketId), organizationId },
      select: { id: true },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const note = await prisma.note.create({
      data: {
        ticketId: ticket.id,
        notesText: notesText.trim(),
      },
    })

    // >> Second write: bump the ticket's updatedAt so "Last Updated" in the
    //    UI reflects the new note. @updatedAt only fires when the TICKET row
    //    itself changes - writing to a child note doesn't touch it, so we do
    //    it explicitly. The update is org-filtered; we already own the ticket.
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}

// GET: with ?ticketId=5 returns one ticket's notes; without it, ALL notes
// of the active organization (joined through the ticket's tenant column).
export async function GET(request: Request) {
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')

    const notes = await prisma.note.findMany({
      // >> undefined `where` = no filter - a neat Prisma idiom. Here the
      //    fallback filter is still tenant-scoped via the parent ticket.
      where: {
        ticket: { organizationId },
        ...(ticketId ? { ticketId: Number(ticketId) } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}
