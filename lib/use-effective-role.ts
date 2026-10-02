"use client"

//
// ─── EFFECTIVE ROLE (org-aware) ────────────────────────────────────────────
// The user's role IN THE ACTIVE ORGANIZATION, not the global User.role.
//
// WHY: a person can be a global ADMIN (created their own room, can manage
// users there) while being an AGENT seat in someone else's room. The header
// avatar badge, the sidebar user-menu gate and the online-agents group must
// reflect THE ROOM YOU ARE IN - this single hook is that source of truth.
//
// Source: authClient.useActiveMember() (org plugin atom; role comes from the
// server for the session's activeOrganizationId - no client-side guessing).
// Falls back to the global role ONLY when no org is active (pre-join state).
// A pending read shows the fallback too, so badges don't flicker to AGENT
// while the atom resolves.

import { authClient, useSession } from "@/lib/auth-client"

export function useEffectiveRole(): { role: "ADMIN" | "AGENT" | null; isPending: boolean } {
    const { data: session } = useSession()
    const globalRole = (session?.user as { role?: string } | undefined)?.role as
        | "ADMIN"
        | "AGENT"
        | undefined

    const { data: activeMember, isPending } = authClient.useActiveMember()
    const orgRole = (activeMember?.role ?? null) as "ADMIN" | "AGENT" | "OWNER" | null

    if (orgRole === "OWNER") return { role: "ADMIN", isPending }
    if (orgRole === "ADMIN" || orgRole === "AGENT") return { role: orgRole, isPending }
    // No active org (yet): the global role is all we have.
    return { role: globalRole ?? null, isPending }
}
