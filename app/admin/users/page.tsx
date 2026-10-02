"use client"

//
// ─── TEAM (/admin/users) ───────────────────────────────────────────────────
// The people of the ACTIVE organization - the sidebar "Team" entry lands
// here. Follows the room you are in (switch room -> the list re-reads):
//
//   - EVERY member (agents included) sees the roster: name, email, org-seat
//     badge. No actions.
//   - Room ADMIN/OWNER additionally gets the actions: Make admin / Make
//     agent (POST /api/members/role - also emails the member) and Remove
//     (org plugin remove-member). Same actions as the org page's Members
//     card, in a full-page form.
//
// WHY NOT authClient.admin.listUsers anymore: that lists GLOBAL users, which
// ignored the active organization (the reported bug). Membership is the
// tenant truth; global admin endpoints stay behind the scenes where needed.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { authClient, useSession } from "@/lib/auth-client"
import { useEffectiveRole } from "@/lib/use-effective-role"
import LayoutClient from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { OnlineAgents } from "@/components/online-agents"
import { InviteMemberDialog } from "@/components/invite-member-dialog"
import { usePresence } from "@/lib/use-presence"
import { toast } from "@/components/ui/toast"
import { Loader2, ShieldCheck, User as UserIcon, ArrowLeft, UserMinus, Users, UserPlus, MoreHorizontal } from "lucide-react"

type MemberRow = {
    id: string
    userId: string
    role: string
    user: { name?: string | null; email: string; image?: string | null }
}

type FullOrg = { id: string; name: string; members: MemberRow[] }

export default function TeamPage() {
    const { data: session } = useSession()
    const me = session?.user
    const meId = me?.id
    const { role: effRole } = useEffectiveRole()
    const canManage = effRole === "ADMIN"

    const { data: activeOrg, isPending: activeLoading } = authClient.useActiveOrganization()

    // >> Online tags: read-only presence for THIS room (no heartbeat - being
    //    on the page must not mark anyone "online" who is not). Online
    //    members sort FIRST, WhatsApp-style; everyone else below.

    const [org, setOrg] = useState<FullOrg | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [busyId, setBusyId] = useState<string | null>(null)
    // >> ADD MEMBER (same invite flow as the org page, in a dialog): admins
    //    click the header button, fill email + role, and the invitation is
    //    emailed. Pending invites are not members yet, so the roster only
    //    changes once they accept.
    const [inviteOpen, setInviteOpen] = useState(false)

    const load = useCallback(async (orgId?: string | null) => {
        if (!orgId) {
            setOrg(null)
            setLoading(false)
            return
        }
        setLoading(true)
        setError(null)
        const res = await authClient.organization.getFullOrganization({
            query: { organizationId: orgId },
        })
        setLoading(false)
        if (res.error) {
            setError(res.error.message ?? "Failed to load the team")
            setOrg(null)
            return
        }
        setOrg((res.data as FullOrg | null) ?? null)
    }, [])

    // >> THE FIX: the effect re-runs on every active-org change, so the team
    //    always reflects the room you are currently working in.
    useEffect(() => {
        if (!activeLoading) load(activeOrg?.id)
    }, [activeOrg?.id, activeLoading, load])

    const changeRole = async (m: MemberRow, role: "ADMIN" | "AGENT") => {
        setBusyId(m.id)
        const toastId = toast.add({
            type: "loading",
            title: role === "ADMIN" ? "Promoting member" : "Changing role",
            description: `Updating ${m.user.email} to ${role}...`,
        })
        try {
            const res = await fetch("/api/members/role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: m.id, role }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || "Request failed")
            await load(activeOrg?.id)
            toast.update(toastId, {
                type: "success",
                title: role === "ADMIN" ? "Promoted to ADMIN" : "Role updated",
                description: `${m.user.email} was emailed about the change.`,
                timeout: 5000,
            })
        } catch (err) {
            toast.update(toastId, {
                type: "error",
                title: "Role change failed",
                description: err instanceof Error ? err.message : "Please try again.",
                timeout: 6000,
            })
        } finally {
            setBusyId(null)
        }
    }

    const removeFromOrg = async (m: MemberRow) => {
        setBusyId(m.id)
        const toastId = toast.add({
            type: "loading",
            title: "Removing from organization",
            description: `Removing ${m.user.email}...`,
        })
        const { error } = await authClient.organization.removeMember({ memberIdOrEmail: m.id })
        setBusyId(null)
        if (error) {
            toast.update(toastId, {
                type: "error",
                title: "Remove failed",
                description: error.message ?? "Could not remove the member.",
                timeout: 6000,
            })
            return
        }
        await load(activeOrg?.id)
        toast.update(toastId, {
            type: "success",
            title: "Member removed",
            description: `${m.user.email} no longer has access.`,
            timeout: 5000,
        })
    }

    const isSelf = (m: MemberRow) => m.userId === meId

    const { online } = usePresence({ beat: false, requireAdmin: false })
    const onlineIds = new Set(online.map((u) => u.id))
    const members = (org?.members ?? [])
        .filter((m) => {
            if (!query.trim()) return true
            const q = query.trim().toLowerCase()
            return (m.user.name ?? "").toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
        })
        // ADMINs first (top of the roster), AGENTs below; online members
        // float to the top within each tier; API order otherwise.
        .sort((a, b) => {
            const roleDiff = (a.role === "ADMIN" ? 0 : 1) - (b.role === "ADMIN" ? 0 : 1)
            if (roleDiff !== 0) return roleDiff
            return Number(onlineIds.has(b.userId)) - Number(onlineIds.has(a.userId))
        })

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-6 flex flex-col gap-1">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit">
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to tickets
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Users className="h-6 w-6" /> Team
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            People in <span className="font-medium text-foreground">{org?.name ?? activeOrg?.name ?? "your active room"}</span>
                            {activeOrg?.name ? " — switch rooms to see another team." : "."}
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-3">
                                    Members {org ? `(${org.members.length})` : ""}
                                    {/* presence avatars hide on mobile - they crowd
                                        the title row there (see responsive fix) */}
                                    <span className="hidden sm:inline-flex">
                                        <OnlineAgents />
                                    </span>
                                </span>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Input
                                        placeholder="Search name or email…"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="h-8 min-w-0 flex-1 sm:flex-none sm:w-44"
                                    />
                                    {canManage && (
                                        <Button size="sm" className="gap-1.5 h-8 shrink-0" onClick={() => setInviteOpen(true)}>
                                            <UserPlus className="h-3.5 w-3.5" /> Add member
                                        </Button>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription>
                                {canManage
                                    ? "ADMINs manage the room; AGENTs work tickets. Role changes email the member."
                                    : "Read-only: only room admins can change roles or remove members."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                            {loading || activeLoading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : !org ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No active room. Join or create one from the Organization page.
                                </p>
                            ) : (
                                <div className="flex flex-col divide-y">
                                    {members.map((m) => (
                                        <div key={m.id} className="flex items-center gap-3 py-3">
                                            <Avatar>
                                                <AvatarImage src={m.user.image ?? undefined} alt={m.user.name ?? ""} />
                                                <AvatarFallback>
                                                    {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate flex items-center gap-2">
                                                    {m.user.name || m.user.email}
                                                    {isSelf(m) && <span className="text-xs text-muted-foreground">(you)</span>}
                                                    {/* WhatsApp-style online tag */}
                                                    {onlineIds.has(m.userId) && (
                                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                            online
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-muted-foreground truncate">{m.user.email}</p>
                                            </div>
                                            {/* role indicator: compact icon only
                                                (ShieldCheck = admin) — no badge */}
                                            {m.role === "ADMIN" ? (
                                                <span title="ADMIN" className="shrink-0 inline-flex">
                                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                                </span>
                                            ) : (
                                                <span title="AGENT" className="shrink-0 inline-flex">
                                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                                </span>
                                            )}
                                            {/* all actions behind one ⋯ button so the
                                                row fits on mobile */}
                                            {canManage && !isSelf(m) && (
                                                busyId === m.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            render={
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Member actions" />
                                                            }
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem onClick={() => changeRole(m, m.role === "AGENT" ? "ADMIN" : "AGENT")}>
                                                                {m.role === "AGENT" ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                                                                {m.role === "AGENT" ? "Make admin" : "Make agent"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => removeFromOrg(m)}>
                                                                <UserMinus className="h-4 w-4" /> Remove
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )
                                            )}
                                        </div>
                                    ))}
                                    {members.length === 0 && (
                                        <p className="py-8 text-center text-sm text-muted-foreground">No members match.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Invite dialog: identical flow to the org page's
                        "Invite a member" card (email + role + emailed link). */}
                    <InviteMemberDialog
                        open={inviteOpen}
                        onOpenChange={setInviteOpen}
                        organizationId={activeOrg?.id}
                        onInvited={() => load(activeOrg?.id)}
                    />
                </div>
            </main>
        </LayoutClient>
    )
}
