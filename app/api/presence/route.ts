//
// ─── PRESENCE HEARTBEAT (who is online, per organization) ──────────────────
//   GET  /api/presence  -> members of the ACTIVE org seen in the last 60s
//   POST /api/presence  -> heartbeat: upsert my Presence row (lastSeenAt now)
//
// Presence is ORG-SCOPED: the row carries the organizationId that was active
// at heartbeat time, and GET only ever returns rows of the CALLER'S active
// org. Switching rooms instantly moves you between avatar groups. "Online"
// = lastSeenAt within 60s (clients heartbeat every 25s; one missed beat is
// tolerated, a closed tab is gone in ~25-85s).
//
// GATE: requireOrgUser — same tenant wall as every other route (lib/rbac.ts).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/rbac";

// Online window: heartbeats land every 25s, so 60s tolerates 1-2 misses
// without keeping a closed tab "online" for long.
const ONLINE_WINDOW_MS = 60_000;

export async function GET() {
    const gate = await requireOrgUser();
    if (!gate.ok) return gate.response;
    const { organizationId } = gate;

    const rows = await prisma.presence.findMany({
        where: {
            organizationId,
            lastSeenAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) },
        },
        include: {
            user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
        orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json({
        online: rows.map((r) => ({
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            image: r.user.image,
            role: r.user.role,
            lastSeenAt: r.lastSeenAt.toISOString(),
        })),
    });
}

export async function POST() {
    const gate = await requireOrgUser();
    if (!gate.ok) return gate.response;
    const { organizationId, session } = gate;

    // >> Upsert (userId is the PK): moving between orgs just overwrites the row.
    await prisma.presence.upsert({
        where: { userId: session.user.id },
        update: { organizationId, lastSeenAt: new Date() },
        create: { userId: session.user.id, organizationId, lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
