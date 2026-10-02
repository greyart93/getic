//
// ─── RBAC + TENANT SCOPING (server-side) ────────────────────────────────────
// The gate between Better Auth sessions and this app's API routes. Pattern
// for every protected route:
//
//   const gate = await requireOrgRole("ADMIN", "AGENT");
//   if (!gate.ok) return gate.response;         // 401 or 403, already JSON
//   const { session, organizationId } = gate;    // 👈 ALWAYS scope queries!
//
// 401 vs 403 semantics — 401 "not who you claim" (no/bad session → client
// should sign in); 403 "authenticated but not allowed" (wrong role/org → do
// not retry). UI checks are UX; THIS is security (defense in depth).
//
// TENANT WALL: every ticket query MUST filter by organizationId. The org id
// comes from the session's activeOrganizationId (set by the organization
// plugin's setActive), never from a request param — a crafted fetch with
// ?organizationId=other gets 403, not another company's data.

import { headers } from "next/headers";
import { auth, type Session } from "@/lib/auth";
import { ORG_LIMITS } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export type AppRole = "ADMIN" | "AGENT";

export type GateResult =
    | { ok: true; session: Session }
    | { ok: false; response: Response };

export type OrgGateResult =
    | { ok: true; session: Session; organizationId: string }
    | { ok: false; response: Response };

async function getSession() {
    return auth.api.getSession({ headers: await headers() });
}

/** Any signed-in user (ADMIN or AGENT). */
export async function requireUser(): Promise<GateResult> {
    const session = await getSession();
    if (!session) {
        return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true, session };
}

/** Signed-in AND holding one of the given GLOBAL roles (User.role). */
export async function requireRole(...roles: AppRole[]): Promise<GateResult> {
    const gate = await requireUser();
    if (!gate.ok) return gate;
    const role = (gate.session.user as { role?: string }).role;
    if (!role || !roles.includes(role as AppRole)) {
        return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return gate;
}

/**
 * Signed-in AND an active organization AND a member of it. Resolves the
 * tenant id for scoping: the session's activeOrganizationId is verified
 * against the Member table (so a stale active id — e.g. after being removed
 * from the org — can never leak another company's tickets).
 */
export async function requireOrgUser(): Promise<OrgGateResult> {
    const gate = await requireUser();
    if (!gate.ok) return gate;
    const { session } = gate;
    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
        return {
            ok: false,
            response: Response.json({ error: "No active organization" }, { status: 403 }),
        };
    }
    const membership = await prisma.member.findFirst({
        where: { organizationId, userId: session.user.id },
        select: { role: true },
    });
    if (!membership) {
        return {
            ok: false,
            response: Response.json({ error: "Not a member of the active organization" }, { status: 403 }),
        };
    }
    return { ok: true, session, organizationId };
}

/** requireOrgUser + one of the given ORG roles (Member.role: OWNER|ADMIN|AGENT). */
export async function requireOrgRole(...roles: string[]): Promise<OrgGateResult> {
    const gate = await requireOrgUser();
    if (!gate.ok) return gate;
    const membership = await prisma.member.findFirst({
        where: { organizationId: gate.organizationId, userId: gate.session.user.id },
        select: { role: true },
    });
    if (!membership?.role || !roles.includes(membership.role)) {
        return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return gate;
}

/**
 * Seat-limit check used by the invite UI/API: can this org seat one more
 * member of the given role? Mirrors the hard enforcement in lib/auth.ts's
 * sendInvitationEmail (the hook throws; this pre-check returns a friendly
 * boolean for the UI so users see "admin seats full" before submitting).
 */
export async function canSeatMember(organizationId: string, role: string): Promise<boolean> {
    const counts = await prisma.member.groupBy({
        by: ["role"],
        where: { organizationId },
        _count: { role: true },
    });
    const admins = counts.find((c) => c.role === "ADMIN" || c.role === "OWNER")?._count.role ?? 0;
    const agents = counts.find((c) => c.role === "AGENT")?._count.role ?? 0;
    if (role === "OWNER" || role === "ADMIN") return admins < ORG_LIMITS.maxAdmins;
    return agents < ORG_LIMITS.maxAgents;
}

/** Just the global role of the current user, or null when signed out. */
export async function currentUserRole(): Promise<AppRole | null> {
    const session = await getSession();
    return (session?.user as { role?: string } | undefined)?.role as AppRole | null ?? null;
}
