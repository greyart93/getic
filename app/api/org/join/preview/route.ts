//
// ─── JOIN PREVIEW (confirm the room BEFORE joining) ────────────────────────
//   POST /api/org/join/preview  { code, password? }
//     -> { name, memberCount, members: [{ name, email, image, role }] }
//
// PRIVACY CONTRACT (the requirement): the room NAME and member list are
// returned ONLY to a caller holding the correct join code AND password
// (when one is set). Anything else = generic 404 "Room not found" - identical
// response for unknown code and wrong password, so nothing can be probed:
// no name leak, no member enumeration, no code-vs-password distinction.
//
// Signed-in users get a `alreadyMember` flag so the UI can show
// "you are already in this room" instead of a broken join attempt.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { verifyPassword } from "better-auth/crypto";

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
            select: {
                id: true,
                name: true,
                joinPasswordHash: true,
                members: {
                    select: {
                        role: true,
                        user: { select: { name: true, email: true, image: true } },
                    },
                },
            },
        });

        // >> Generic not-found: unknown code OR wrong password are identical.
        if (!org) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        if (org.joinPasswordHash) {
            const ok = password ? await verifyPassword({ hash: org.joinPasswordHash, password }) : false;
            if (!ok) return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // >> Count every seat (admins count as people in the room too).
        const members = org.members.map((m) => ({
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role,
        }));

        const alreadyMember = org.members.some((m) => m.user.email === session.user.email);

        return NextResponse.json({
            name: org.name,
            memberCount: members.length,
            members,
            alreadyMember,
        });
    } catch (error) {
        console.error("Error previewing room:", error);
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
}
