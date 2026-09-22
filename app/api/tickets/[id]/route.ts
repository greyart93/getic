import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// NOTE: Dates are returned as raw ISO 8601 UTC strings. All timezone conversion
// and formatting happens client-side (see lib/datetime.ts) so users always see
// the time in their own timezone, regardless of the server's (Vercel = UTC).

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    let status = body.status
    if (status === 'IN PROGRESS') status = 'IN_PROGRESS'

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
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting ticket:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
