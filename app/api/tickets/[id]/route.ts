import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 👇 Helper functions (copy these from your main route if they are in a separate file)
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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

    // 👇 Format the dates before sending to frontend
    const formattedTicket = {
      ...updated,
      date: formatDate(updated.createdAt),
      createdAt: formatDateTime(updated.createdAt),
      updatedAt: formatDateTime(updated.updatedAt),
    }

    return NextResponse.json(formattedTicket)
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
