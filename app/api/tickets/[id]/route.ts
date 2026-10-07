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
// -- ASSIGNMENT (assigneeId) -- validated against THIS org's Member table
//   before the write; a foreign userId gets a 400. A new assignment is
//   logged to the activity feed (TICKET_ASSIGNED); unassigning is silent.
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

    // >> priority: whitelist against the DB enum; anything else is ignored
    //    (undefined = field untouched by the partial update below).
    const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
    const priority = PRIORITIES.includes(body.priority) ? body.priority : undefined

    // >> TENANT CHECK: fetch the ticket scoped to THIS org. findFirst with the
    //    organizationId in the where means another company's ticket id is
    //    indistinguishable from a nonexistent one -> uniform 404 below.
    const before = await prisma.ticket.findFirst({
      where: { id: Number(id), organizationId },
    })
    if (!before) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // >> ASSIGNEE: null = unassign (back to the shared queue); a value must
    //    be a member of THIS org. The lookup doubles as the assignee's name
    //    for the activity log entry below.
    let assigneeId: string | null | undefined = undefined
    let assigneeName: string | null = null
    if (body.assigneeId !== undefined) {
      if (body.assigneeId === null || body.assigneeId === '') {
        assigneeId = null
      } else {
        const member = await prisma.member.findFirst({
          where: { organizationId, userId: String(body.assigneeId) },
          include: { user: { select: { name: true, email: true } } },
        })
        if (!member) {
          return NextResponse.json(
            { error: 'Assignee is not a member of this organization' },
            { status: 400 }
          )
        }
        assigneeId = body.assigneeId
        assigneeName = member.user.name ?? member.user.email
      }
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
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
      },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // >> include the assignee so the optimistic store row gets the nested
    //    user object ({ ...t, ...updated } in the store needs it to render
    //    the avatar/name — the raw column is just a userId string)
    const updated = await prisma.ticket.findUnique({
      where: { id: before.id },
      include: { assignee: { select: { id: true, name: true, email: true, image: true } } },
    })

    // >> Feed: a NEW assignment lands on /notifications. Unassigning or
    //    re-assigning to the same person is not news — only log real changes.
    if (assigneeId && assigneeId !== before.assigneeId && updated) {
      await logActivity({
        type: 'TICKET_ASSIGNED',
        organizationId,
        title: `${updated.ticketId} assigned to ${assigneeName ?? 'a teammate'}`,
        description: updated.subject,
        actorId: gate.session.user.id,
        actorName: gate.session.user.name ?? gate.session.user.email,
      })
    }

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
