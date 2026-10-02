//
// ─── JOIN (enter a room by code + optional password) ───────────────────────
//   POST /api/org/join  { code, password? }
//     -> { success: true, organizationId, organizationName, role: "AGENT" }
//
// Same credential check as /api/org/join/preview (generic 404 on any
// failure - no probing). On success the caller becomes an AGENT seat and
// the room becomes their ACTIVE organization.
//
// GUARDS:
//   - already a member  -> 409 with the org id (front-end offers "switch to it")
//   - seat caps         -> AGENT_SEAT_LIMIT_REACHED (mirrors lib/auth.ts hook;
//                          <=1000 AGENT seats per room)
//   - unverified email  -> still allowed: requireOrgUser gates their API
//                          access on protected routes anyway (defense in depth)
//
// WHY A CUSTOM ROUTE: the org plugin has no join-by-credentials endpoint;
// addMember's API requires an admin session of that org, which a joiner by
// definition does not have yet.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { verifyPassword } from "better-auth/crypto";
import { ORG_LIMITS } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
    const gate = await requireUser();
    if (!gate.ok) return gate.response;
    const { session } = gate;

    try {
        const body = await request.json().catch(() => ({}));
        const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!code) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        const org = await prisma.organization.findUnique({
            where: { joinCode: code },
            select: { id: true, name: true, joinPasswordHash: true },
        });
        if (!org) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        if (org.joinPasswordHash) {
            const ok = password ? await verifyPassword({ hash: org.joinPasswordHash, password }) : false;
            if (!ok) return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // >> Already in? Tell the client so it can offer "switch to it".
        const existing = await prisma.member.findFirst({
            where: { organizationId: org.id, userId: session.user.id },
        });
        if (existing) {
            return NextResponse.json(
                { error: "You are already a member of this room", organizationId: org.id, alreadyMember: true },
                { status: 409 }
            );
        }

        // >> Seat cap: mirror the invite hook's AGENT limit.
        const agents = await prisma.member.count({
            where: { organizationId: org.id, role: "AGENT" },
        });
        if (agents >= ORG_LIMITS.maxAgents) {
            return NextResponse.json({ error: `AGENT_SEAT_LIMIT_REACHED (${agents}/${ORG_LIMITS.maxAgents})` }, { status: 400 });
        }

        // >> The write: AGENT seat (never ADMIN via join - admins are invited).
        await prisma.member.create({
            data: { id: `mem_${org.id}_${session.user.id}`, organizationId: org.id, userId: session.user.id, role: "AGENT" },
        });

        // >> Make it the active room so tickets scope to it immediately.
        await auth.api.setActiveOrganization({
            body: { organizationId: org.id },
            headers: await headers(),
        });

        // >> Feed: the whole room sees who joined by credentials.
        await logActivity({
            type: "JOINED_VIA_CODE",
            organizationId: org.id,
            title: `${session.user.name ?? session.user.email} joined the room`,
            description: `Used a room ID to join as AGENT`,
            actorId: session.user.id,
            actorName: session.user.name ?? session.user.email,
        });

        console.log(`[org] ${session.user.email} joined ${org.name} (${org.id}) via join code`);
        return NextResponse.json({ success: true, organizationId: org.id, organizationName: org.name, role: "AGENT" });
    } catch (error) {
        console.error("Error joining room:", error);
        return NextResponse.json({ error: "Failed to join the room" }, { status: 500 });
    }
}
