//
// ─── MEMBER ROLE CHANGE (server) ───────────────────────────────────────────
// POST /api/members/role  { memberId, role: "ADMIN" | "AGENT" }
//
// WHY A CUSTOM ROUTE INSTEAD OF CALLING better-auth's
// authClient.organization.updateMemberRole() directly from the org page:
//   1. It centralizes the gate with the rest of this app's RBAC
//      (lib/rbac.ts) instead of relying on the org plugin's permission
//      wiring for this deployment's roles.
//   2. It sends the "you have been promoted" email in the same transaction
//      - the org plugin has no role-change email hook.
//
// The role write itself goes through better-auth's updateMemberRole
// (same endpoint the client plugin would hit) so permission checks inside
// the plugin still apply. Then the member is emailed that their role
// changed, with a button to open the org. The agent sees the new role on
// next reload: useActiveMember / useActiveOrganization refetch on mount.
//
// NOTES ON SELF-DEMOTION: you cannot change your OWN role. Demoting
// yourself to AGENT is the classic last-admin footgun (nobody left who can
// promote anyone back).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { sendRoleChangedEmail } from "@/lib/email";
import { headers } from "next/headers";

const ORG_ROLES = ["ADMIN", "AGENT"] as const;
type OrgRole = (typeof ORG_ROLES)[number];

export async function POST(request: Request) {
    // >> Only ADMIN/OWNER members of the ACTIVE organization may change roles.
    const gate = await requireOrgRole("ADMIN", "OWNER");
    if (!gate.ok) return gate.response;
    const { organizationId, session } = gate;

    try {
        const body = await request.json();
        // >> Two lookup keys: memberId (org page knows it) or userId (the
        //    admin users page only has User rows). Both resolve inside the
        //    ACTIVE org - no cross-tenant writes.
        const { memberId, userId, role } = (body ?? {}) as {
            memberId?: string;
            userId?: string;
            role?: string;
        };

        if ((!memberId && !userId) || !ORG_ROLES.includes(role as OrgRole)) {
            return NextResponse.json(
                { error: "memberId (or userId) and role (ADMIN|AGENT) are required" },
                { status: 400 }
            );
        }

        // >> TS narrowing: Array.includes does not narrow the union, so cast
        // once here and use orgRole everywhere below.
        const orgRole = role as OrgRole;

        // >> Target must be a member of THIS org (no cross-tenant writes).
        const target = await prisma.member.findFirst({
            where: memberId ? { id: memberId, organizationId } : { userId, organizationId },
            include: { user: { select: { id: true, email: true, name: true } } },
        });
        if (!target) {
            return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
        }

        // >> No self-serve role changes: an admin cannot promote/demote themselves.
        if (target.userId === session.user.id) {
            return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
        }

        // >> Demotion guard: leaving zero admins/owners in the room would lock
        //    everyone out of role management. Count OTHER admins besides the target.
        if (target.role !== "AGENT" && orgRole === "AGENT") {
            const otherAdmins = await prisma.member.count({
                where: { organizationId, id: { not: target.id }, role: { in: ["ADMIN", "OWNER"] } },
            });
            if (otherAdmins === 0) {
                return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 });
            }
        }

        // >> The write goes through better-auth's updateMemberRole so its own
        //    permission checks still run on top of our gate.
        const reqHeaders = await headers();
        await auth.api.updateMemberRole({
            body: { memberId: target.id, role: orgRole },
            headers: reqHeaders,
        });

        // >> Row updated (or plugin refused) - verify before claiming success.
        const updated = await prisma.member.findUnique({ where: { id: target.id } });
        if (!updated || updated.role !== orgRole) {
            return NextResponse.json({ error: "Role update was not allowed" }, { status: 403 });
        }

        // >> NOTIFY: "you have been promoted / demoted" email with a button
        //    to open the org. Fire-and-wait; the sender never throws (dev
        //    without SMTP logs instead of sending).
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        const emailed = await sendRoleChangedEmail({
            to: target.user.email,
            name: target.user.name ?? undefined,
            orgName: org?.name ?? "your organization",
            newRole: orgRole,
            appUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        });

        console.log(`[org] role change: member ${target.id} -> ${orgRole} in ${organizationId} (email to ${target.user.email}: ${emailed ? "sent" : "logged"})`);
        return NextResponse.json({ success: true, member: updated, emailed });
    } catch (error) {
        console.error("Error changing member role:", error);
        return NextResponse.json({ error: "Failed to change member role" }, { status: 500 });
    }
}
