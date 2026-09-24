//
// ─── SINGLE TICKET API ───────────────────────────────────────────────────
//   PATCH  /api/tickets/[id]   partial update (edit form / status dropdown)
//   DELETE /api/tickets/[id]   delete one ticket (its notes cascade too)
//
// NOTE ON DATES: raw ISO 8601 UTC strings only — client formats its own
// timezone via lib/datetime.ts (was a real production bug on Vercel).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  // 👇 Next 15+ quirk: dynamic route params are a Promise, must be awaited
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 👇 Normalize: the UI sends "IN PROGRESS" (with a space, for display);
    //    the Postgres enum is "IN_PROGRESS" (with underscore). Map before save.
    let status = body.status
    if (status === 'IN PROGRESS') status = 'IN_PROGRESS'

    // 👇 PARTIAL UPDATE trick: spread-conditional — a field is only included
    //    in the Prisma `data` object if it was sent in the request body, so
    //    PATCH with just { status } won't wipe the other columns.
    const updated = await prisma.ticket.update({
      where: { id: Number(id) },
      data: {
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.customerName !== undefined && { customerName: body.customerName }),
        ...(body.customerEmail !== undefined && { customerEmail: body.customerEmail }),
        ...(body.description !== undefined && { description: body.description }),
        ...(status !== undefined && { status }),
      },
    })

    // 👇 Send raw dates; client formats them in its own timezone
    return NextResponse.json(updated)
  } catch (error) {
    console.error('❌ Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.ticket.delete({
      where: { id: Number(id) },
      // 👇 No note cleanup needed: onDelete: Cascade handles it in the DB
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting ticket:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
