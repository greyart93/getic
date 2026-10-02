//
// === SINGLE TICKET API ===================================================
//   PATCH  /api/tickets/[id]   partial update (edit form / status dropdown)
//   DELETE /api/tickets/[id]   delete one ticket (its notes cascade too)
//
// -- AUTH (multi-tenant via lib/rbac.ts) -- PATCH -> any member of the
//   ACTIVE organization; DELETE -> ADMIN/OWNER of that organization.
//
// -- TENANCY: the ticket is fetched first and its organizationId is compared
//    to the session's active one; a cross-org id gets 404 (not 403 - never
//    confirm to a foreign member that a ticket id exists at all). Mutating
//    queries ALSO filter by organizationId so a TOCTOU race cannot cross
//    the wall between the check and the write.
//
// -- EMAIL (Nodemailer SMTP) -- when PATCH changes ONLY the status (the
//   dropdown flow), the customer gets a status-change email. Edits that
//   include other fields don't email (that's an agent correcting data, not
//   a status event).
//
// NOTE ON DATES: raw ISO 8601 UTC strings only - client formats its own
// timezone via lib/datetime.ts (was a real production bug on Vercel).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgUser, requireOrgRole } from '@/lib/rbac'
import { sendTicketStatusEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  request: Request,
  // >> Next 15+ quirk: dynamic route params are a Promise, must be awaited
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const { id } = await params
    const body = await request.json()

    // >> Normalize: the UI sends "IN PROGRESS" (with a space, for display);
    //    the Postgres enum is "IN_PROGRESS" (with underscore). Map before save.
    let status = body.status
    if (status === 'IN PROGRESS') status = 'IN_PROGRESS'

    // >> TENANT CHECK: fetch the ticket scoped to THIS org. findFirst with the
    //    organizationId in the where means another company's ticket id is
    //    indistinguishable from a nonexistent one -> uniform 404 below.
    const before = await prisma.ticket.findFirst({
      where: { id: Number(id), organizationId },
    })
    if (!before) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // >> PARTIAL UPDATE trick: spread-conditional - a field is only included
    //    in the Prisma `data` object if it was sent in the request body, so
    //    PATCH with just { status } won't wipe the other columns.
    // >> updateMany (not update) re-asserts the tenant wall at write time:
    //    the organizationId filter is part of the same SQL statement, so a
    //    concurrent membership change can't slip a cross-org write through.
    const result = await prisma.ticket.updateMany({
      where: { id: before.id, organizationId },
      data: {
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.customerName !== undefined && { customerName: body.customerName }),
        ...(body.customerEmail !== undefined && { customerEmail: body.customerEmail }),
        ...(body.description !== undefined && { description: body.description }),
        ...(status !== undefined && { status }),
      },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const updated = await prisma.ticket.findUnique({ where: { id: before.id } })

    // >> Email ONLY a pure status change (dropdown flow) where the value truly
    //    changed. best-effort: the sender never throws.
    const isPureStatusChange =
      body.subject === undefined &&
      body.customerName === undefined &&
      body.customerEmail === undefined &&
      body.description === undefined &&
      status !== undefined &&
      updated &&
      before.status !== updated.status
    if (isPureStatusChange && updated) {
      await sendTicketStatusEmail({
        to: updated.customerEmail,
        customerName: updated.customerName,
        ticketId: updated.ticketId,
        subject: updated.subject,
        newStatus: updated.status,
      })

      // >> Feed: status moves are the heartbeat of the room's news feed.
      await logActivity({
        type: 'STATUS_CHANGED',
        organizationId,
        title: `${updated.ticketId} → ${updated.status.replace('_', ' ')}`,
        description: `${updated.subject} — customer emailed`,
        actorId: gate.session.user.id,
        actorName: gate.session.user.name ?? gate.session.user.email,
      })
    }

    // >> Send raw dates; client formats them in its own timezone
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // >> RBAC: single delete is destructive - ADMIN/OWNER of THIS org only
  const gate = await requireOrgRole("ADMIN", "OWNER")
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const { id } = await params
    // >> deleteMany (not delete) keeps the tenant wall in the same SQL
    //    statement; a foreign org's id simply deletes 0 rows.
    const result = await prisma.ticket.deleteMany({
      where: { id: Number(id), organizationId },
      // >> No note cleanup needed: onDelete: Cascade handles it in the DB
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
