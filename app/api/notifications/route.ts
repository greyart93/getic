//
// ─── NOTIFICATIONS FEED API ─────────────────────────────────────────────────
//   GET /api/notifications  →  {
//     events:    Activity[]  (org feed: every org I belong to, newest first)
//     invites:   pending Invitation rows for MY email (with Accept payload)
//   }
//
// Two sources, one payload:
//   1. Activity rows (lib/activity.ts writers) scoped to my organizations —
//      invite sent/accepted, join-by-code, role changes, tickets, notes.
//   2. LIVE pending Invitation rows for my email. They are read from the
//      Invitation table, not the log, so an invite sent BEFORE the invitee
//      ever signed up still shows up here (flow D) and vanishes the moment
//      it is accepted/canceled/expired.
//
// Auth: requireUser (any signed-in user). Tenancy: org ids come from the
// Member table for MY user id — never from a client-supplied parameter.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export async function GET() {
    const gate = await requireUser();
    if (!gate.ok) return gate.response;
    const { session } = gate;
    const me = session.user;

    // >> My org memberships — the scope for the feed (the tenant wall).
    const myMemberships = await prisma.member.findMany({
        where: { userId: me.id },
        select: { organizationId: true },
    });
    const myOrgIds = myMemberships.map((m) => m.organizationId);

    const [events, invites, myOrgNames] = await Promise.all([
        myOrgIds.length
            ? prisma.activity.findMany({
                where: { organizationId: { in: myOrgIds } },
                orderBy: { createdAt: "desc" },
                take: 100,
            })
            : Promise.resolve([]),
        prisma.invitation.findMany({
            where: {
                email: me.email.toLowerCase(),
                status: "pending",
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
            include: {
                organization: { select: { id: true, name: true } },
                inviter: { select: { name: true, email: true } },
            },
        }),
        myOrgIds.length
            ? prisma.organization.findMany({
                where: { id: { in: myOrgIds } },
                select: { id: true, name: true },
            })
            : Promise.resolve([]),
    ]);

    const orgNameById = new Map(myOrgNames.map((o) => [o.id, o.name]));

    return NextResponse.json({
        events: events.map((e) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            description: e.description,
            actorName: e.actorName,
            organizationName: e.organizationId ? orgNameById.get(e.organizationId) ?? null : null,
            createdAt: e.createdAt,
        })),
        invites: invites.map((i) => ({
            id: i.id,
            organizationId: i.organization.id,
            organizationName: i.organization.name,
            role: i.role,
            inviterName: i.inviter.name ?? i.inviter.email,
            expiresAt: i.expiresAt,
            createdAt: i.createdAt,
        })),
    });
}
