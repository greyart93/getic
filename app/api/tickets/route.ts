//
// === TICKETS COLLECTION API ==============================================
//   POST   /api/tickets    create a ticket (auto-generates "TKT-XXX" code)
//   GET    /api/tickets    list THIS ORG's tickets, newest first, notes nested
//   DELETE /api/tickets    bulk delete by { ids: [1, 2, 3] } (org's own only)
//
// -- AUTH (multi-tenant via lib/rbac.ts) --
//   POST/GET  -> any signed-in member of the ACTIVE organization
//   DELETE    -> ADMIN or OWNER of that organization (destructive bulk op)
//
// -- ASSIGNMENT (assigneeId) -- the id must be a Member of THIS org; the
//   membership check below IS the tenant wall for the relation (a crafted
//   body pointing at a foreign user gets a 400, never a link).
//
// -- TENANCY: every query filters by organizationId from the session's
//    activeOrganizationId (never a request param) - company A can never
//    read, create into, or delete company B's tickets.
//
// -- EMAIL (Nodemailer SMTP, lib/email.tsx) --
//   POST -> customer gets a "ticket received" email. Without SMTP_HOST the
//   sender logs instead of sending - never blocks the mutation.
//
// -- DESIGN DECISION: full-array GET (reverted from server-side paging) --
// An earlier iteration served ?page=&pageSize= envelopes (SQL LIMIT/OFFSET).
// It was reverted deliberately: the table's filter/search run client-side,
// so paged responses made filters operate on a 10-row slice ("Closed" often
// showed 1-3 rows despite 34 existing). With one small table the pragmatic
// design is: ONE fetch of everything, filter + paginate in the browser -
// instant (zero network) on every filter/page action. If the table grows,
// re-introduce ?status=&search= params (filter IN SQL) alongside paging -
// see PAGINATION.md for both designs and the trade-offs.
//
// NOTE ON DATES: everything is returned as raw ISO 8601 UTC strings. No
// toLocaleString() here - the server's timezone (Vercel = UTC) is NOT the
// user's. The client formats via lib/datetime.ts so every visitor sees their
// own local time. This was a real production bug; don't reintroduce it.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgUser, requireOrgRole } from '@/lib/rbac'
import { sendTicketCreatedEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export async function POST(request: Request) {
  // >> TENANT GATE: must be signed in AND belong to the active organization.
  //    The UI hides the button; THIS is the real gate - a crafted fetch
  //    without a session (or with no org) gets a 401/403.
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const body = await request.json()

    // >> OPTIONAL FIELDS from the create form. priority is whitelisted
    //    against the DB enum (anything else falls back to the default);
    //    assigneeId must belong to THIS org - the membership lookup is the
    //    tenant wall for the relation (same idea as the organizationId
    //    column: never trust a client-supplied id).
    const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
    const priority = PRIORITIES.includes(body.priority) ? body.priority : 'MEDIUM'

    let assigneeId: string | null = null
    if (body.assigneeId) {
      const member = await prisma.member.findFirst({
        where: { organizationId, userId: String(body.assigneeId) },
      })
      if (!member) {
        return NextResponse.json(
          { error: 'Assignee is not a member of this organization' },
          { status: 400 }
        )
      }
      assigneeId = body.assigneeId
    }

    // STEP 1: create the row first, because we need the auto-incremented `id`
    // to build the human-friendly display code ("TKT-001", "TKT-002", ...)
    // >> organizationId comes from the SESSION, never the body - a client
    //    cannot post a ticket into another company's room.
    const created = await prisma.ticket.create({
      data: {
        organizationId, // >> the tenant wall, written at creation time
        customerName: body.customerName || body.customer_name,
        customerEmail: body.customerEmail || body.customer_email,
        subject: body.subject,
        description: body.description || 'Created from UI',
        status: 'OPEN', // >> every new ticket starts here (enum value)
        priority,
        assigneeId,
      },
    })

    // STEP 2: pad the id to 3 digits and write the display code
    // (id 7 -> "TKT-007"). Two DB round-trips, but id generation is atomic.
    const ticketId = `TKT-${String(created.id).padStart(3, '0')}`

    const newTicket = await prisma.ticket.update({
      where: { id: created.id },
      data: { ticketId },
      // >> include the assignee so the optimistic store row can render the
      //    avatar/name without a refetch (same shape as the GET below)
      include: { assignee: { select: { id: true, name: true, email: true, image: true } } },
    })

    // >> EMAIL: "we got your ticket" to the customer. Fire-and-wait (serverless
    //    freezes unawaited promises after the response); the sender never
    //    throws, so an email outage can't fail the ticket creation.
    await sendTicketCreatedEmail({
      to: newTicket.customerEmail,
      customerName: newTicket.customerName,
      ticketId,
      subject: newTicket.subject,
    })

    // >> Feed: the room sees every new ticket on /notifications.
    await logActivity({
      type: 'TICKET_CREATED',
      organizationId,
      title: `${ticketId} · ${newTicket.subject}`,
      description: `New ticket from ${newTicket.customerName} (${newTicket.customerEmail})`,
      actorId: gate.session.user.id,
      actorName: gate.session.user.name ?? gate.session.user.email,
    })

    // >> Send raw dates; client formats them in its own timezone
    return NextResponse.json(newTicket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

// GET - this org's tickets only, newest first, notes nested. The zustand
// store fetches this ONCE on page load; filter/search/pagination all happen
// client-side in the TanStack table (see the design note in the file header).
export async function GET() {
  const gate = await requireOrgUser()
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const tickets = await prisma.ticket.findMany({
      // >> THE TENANT WALL: one where-clause is all tenant isolation takes.
      //    organizationId is verified against the Member table in the gate.
      where: { organizationId },
      orderBy: { createdAt: 'desc' }, // newest first (the table can re-sort)
      include: {
        // >> JOIN: each ticket comes with its notes array nested inside it,
        //    so the view dialog never needs a second fetch. assignee is the
        //    org member the ticket is assigned to (null = shared queue).
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    // >> Send raw dates; client formats them in its own timezone
    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

// DELETE: bulk delete used by the table's checkbox toolbar.
// Body: { ids: [1, 5, 9] }. deleteMany with `in` = one SQL statement.
// >> The where ALSO includes organizationId - ids pointing at another
//    company's tickets are silently ignored (no leak, no error to fish with).
export async function DELETE(request: Request) {
  // >> RBAC: bulk delete is destructive - ADMIN/OWNER of THIS org only
  const gate = await requireOrgRole("ADMIN", "OWNER")
  if (!gate.ok) return gate.response
  const { organizationId } = gate

  try {
    const body = await request.json()
    const { ids } = body

    if (Array.isArray(ids) && ids.length > 0) {
      await prisma.ticket.deleteMany({
        where: {
          id: { in: ids.map(Number) },
          organizationId, // >> never delete outside the active org
        },
      })
      // >> Notes need no cleanup here: onDelete: Cascade in schema.prisma
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tickets:', error)
    return NextResponse.json({ error: 'Failed to delete tickets' }, { status: 500 })
  }
}
