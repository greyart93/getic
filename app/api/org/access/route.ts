//
// ─── ROOM ACCESS (admin: view/rotate join code, set/clear password) ────────
//   GET  /api/org/access   -> { joinCode, hasPassword }  (ADMIN/OWNER only)
//   POST /api/org/access   -> { joinCode?, password?|null }
//                             (rotate code and/or set password; password
//                             null clears it = code alone can join)
//
// The join code is the shareable "room id"; the optional password gates it
// (scrypt hash via better-auth/crypto - never stored in plaintext). Both are
// what /api/org/join[/preview] validate. Name/member privacy is enforced
// THERE: wrong credentials yield a generic 404 with zero org details.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/rbac";
import { hashPassword, generateRandomString } from "better-auth/crypto";

// Unambiguous alphabet: no 0/O, 1/I/L confusion when read aloud or copied.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function GET() {
    const gate = await requireOrgRole("ADMIN", "OWNER");
    if (!gate.ok) return gate.response;

    const org = await prisma.organization.findUnique({
        where: { id: gate.organizationId },
        select: { joinCode: true, joinPasswordHash: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({ joinCode: org.joinCode, hasPassword: !!org.joinPasswordHash });
}

export async function POST(request: Request) {
    const gate = await requireOrgRole("ADMIN", "OWNER");
    if (!gate.ok) return gate.response;
    const { organizationId } = gate;

    try {
        const body = await request.json().catch(() => ({}));
        const data: { joinCode?: string; joinPasswordHash?: string | null } = {};

        // >> Rotate code: 8 chars from the unambiguous alphabet. Case-insensitive
        //    on purpose - the join endpoint uppercases input before matching.
        if (body?.rotateCode === true) {
            let code = "";
            for (let attempt = 0; attempt < 5; attempt++) {
                code = Array.from({ length: 8 }, () =>
                    CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length))
                ).join("");
                const clash = await prisma.organization.findUnique({ where: { joinCode: code } });
                if (!clash) break;
                code = "";
            }
            if (!code) return NextResponse.json({ error: "Could not generate a unique code" }, { status: 500 });
            data.joinCode = code;
        }

        // >> Set/change password (min 4 chars - it guards a room code, not a
        //    login) or clear it with null.
        if (body && "password" in body) {
            const pw = body.password as string | null | undefined;
            if (pw === null || pw === "") {
                data.joinPasswordHash = null;
            } else if (typeof pw === "string") {
                if (pw.length < 4) {
                    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
                }
                data.joinPasswordHash = await hashPassword(pw);
            }
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const org = await prisma.organization.update({
            where: { id: organizationId },
            data,
            select: { joinCode: true, joinPasswordHash: true },
        });

        console.log(`[org] access updated for ${organizationId} (hasPassword=${!!org.joinPasswordHash})`);
        return NextResponse.json({ joinCode: org.joinCode, hasPassword: !!org.joinPasswordHash });
    } catch (error) {
        console.error("Error updating room access:", error);
        return NextResponse.json({ error: "Failed to update room access" }, { status: 500 });
    }
}

// generateRandomString is re-exported usefully for future token needs; keep
// the import honest.
void generateRandomString;
