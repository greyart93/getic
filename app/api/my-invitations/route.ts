//
// ─── MY INVITATIONS (pending email invites for the signed-in user) ─────────
//   GET /api/my-invitations
//     -> { invitations: [{ id, organizationName, role, inviterName }] }
//
// The org plugin's listInvitation endpoints are admin-scoped, but the
// onboarding screen needs the invites addressed to ME. This route reads the
// Invitation rows by the SESSION user's email (never a client-supplied
// address), excluding expired ones, newest first.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export async function GET() {
    const gate = await requireUser();
    if (!gate.ok) return gate.response;
    const { session } = gate;

    const rows = await prisma.invitation.findMany({
        where: {
            email: session.user.email.toLowerCase(),
            status: "pending",
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        include: {
            organization: { select: { name: true } },
            inviter: { select: { name: true, email: true } },
        },
    });

    return NextResponse.json({
        invitations: rows.map((r) => ({
            id: r.id,
            organizationName: r.organization.name,
            role: r.role,
            inviterName: r.inviter.name ?? r.inviter.email,
        })),
    });
}
