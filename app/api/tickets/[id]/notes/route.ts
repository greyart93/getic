//
// === NOTES FOR ONE TICKET API ============================================
//   POST /api/tickets/[id]/notes   add a note to ticket #id
//   GET  /api/tickets/[id]/notes   list that ticket's notes, newest first
//
// Same job as /api/notes but scoped by the URL path instead of a query param.
// The view dialog uses this when refreshing a single ticket's notes.
//
// -- TENANCY: every query filters through the parent ticket's organizationId
//    (relation filter) - a foreign org's ticket id yields an empty list on
//    GET and a 404 on POST, indistinguishable from a nonexistent ticket.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgUser } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // >> TENANT GATE: signed-in member of the active organization
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

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

    // >> TENANT CHECK: ticket must belong to the active org, else uniform 404
    const ticket = await prisma.ticket.findFirst({
      where: { id: Number(id), organizationId },
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

    // >> Bump the parent ticket's updatedAt (child writes don't do it
    //    automatically - see the longer comment in app/api/notes/route.ts)
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    })

    // >> Feed: internal notes show on the room's news feed (text not logged
    //    verbatim — notes can hold sensitive detail).
    const full = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: { ticketId: true, subject: true },
    })
    await logActivity({
      type: 'NOTE_ADDED',
      organizationId,
      title: `${full?.ticketId ?? 'Ticket'} · note added`,
      description: `${gate.session.user.name ?? gate.session.user.email} noted on "${full?.subject ?? 'a ticket'}"`,
      actorId: gate.session.user.id,
      actorName: gate.session.user.name ?? gate.session.user.email,
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const { id } = await params
    const notes = await prisma.note.findMany({
      // >> Relation filter keeps the tenant wall in SQL: notes of tickets
      //    outside the active org are not returned (and cannot be probed).
      where: { ticketId: Number(id), ticket: { organizationId } },
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
