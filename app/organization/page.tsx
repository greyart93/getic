"use client"

//
// ─── ORGANIZATION PAGE (/organization) ─────────────────────────────────────
// Multi-tenant "rooms" UI, rendered inside the sidebar layout like every
// other page (LayoutClient). Features:
//   - Active-org SELECT (components/ui/select) + spinner while switching
//   - Toasts (loading/success/failure) on create / switch / invite / accept
//   - Member list with role changes (promote/demote via /api/members/role,
//     which also emails the member) and remove-member
//   - ADMIN-only "Room access" card: share/rotate the join CODE and set a
//     password (join-by-credentials)
//   - "Join with a room ID" card: code + optional password -> confirmation
//     view (room name + member avatars + count) -> join as AGENT
//   - Deep-link invite acceptance via ?invite=<invitationId> (auto-join)
//
// Privacy: the confirmation view gets name/members ONLY from
// /api/org/join/preview, which returns them exclusively on correct
// code+password. Wrong credentials = generic "Room not found" (no probing).

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient, useSession } from "@/lib/auth-client"
import LayoutClient from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field } from "@/components/ui/field"
import { toast } from "@/components/ui/toast"
import {
    Loader2, Users, UserPlus, ShieldCheck, UserMinus, User as UserIcon,
    KeyRound, Copy, RefreshCw, DoorOpen, Eye,
} from "lucide-react"

// >> slugify: kebab-case the org name for its unique slug ("Acme Support" ->
//    "acme-support"); better-auth also appends a suffix on collision.
function slugify(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org"
}

type MemberRow = {
    id: string
    userId: string
    role: string
    user: { name?: string | null; email: string; image?: string | null }
}

type FullOrg = { id: string; name: string; members: MemberRow[] }

type RoomPreview = {
    name: string
    memberCount: number
    members: { name?: string | null; email: string; image?: string | null; role: string }[]
    alreadyMember: boolean
}

export default function OrganizationPage() {
    const router = useRouter()
    const search = useSearchParams()
    const inviteId = search.get("invite")

    const { data: session, refetch: refetchSession } = useSession()
    const meId = session?.user?.id

    const { data: orgs, isPending: orgsLoading, refetch: refetchOrgs } = authClient.useListOrganizations()
    const { data: activeOrg, isPending: activeLoading, refetch: refetchActive } = authClient.useActiveOrganization()

    // >> Full org incl. members, for the active room. Local state + manual
    //    refetch (not a hook) so role changes/removals re-read fresh data.
    const [full, setFull] = useState<FullOrg | null>(null)
    const [fullLoading, setFullLoading] = useState(false)

    const [name, setName] = useState("")
    const [creating, setCreating] = useState(false)
    const [switching, setSwitching] = useState(false)

    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<"ADMIN" | "AGENT">("AGENT")
    const [inviting, setInviting] = useState(false)

    const [accepting, setAccepting] = useState(false)
    const [acceptError, setAcceptError] = useState<string | null>(null)

    const [busyId, setBusyId] = useState<string | null>(null)

    // >> ONBOARDING GATE: a user with no rooms lands on /welcome (create or
    //    join). Only users who HAVE orgs see this page.
    const noOrgs = !orgsLoading && (orgs ?? []).length === 0
    useEffect(() => {
        if (noOrgs) router.replace("/welcome")
    }, [noOrgs, router])

    // ── ROOM ACCESS (admin) ──
    const [access, setAccess] = useState<{ joinCode: string; hasPassword: boolean } | null>(null)
    const [joinPassword, setJoinPassword] = useState("")
    const [accessBusy, setAccessBusy] = useState(false)

    // ── JOIN BY ROOM ID ──
    const [joinCode, setJoinCode] = useState("")
    const [joinPw, setJoinPw] = useState("")
    const [preview, setPreview] = useState<RoomPreview | null>(null)
    const [previewBusy, setPreviewBusy] = useState(false)
    const [joining, setJoining] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)

    const loadFull = useCallback(async (orgId?: string | null) => {
        if (!orgId) {
            setFull(null)
            return
        }
        setFullLoading(true)
        const res = await authClient.organization.getFullOrganization({
            query: { organizationId: orgId },
        })
        setFullLoading(false)
        setFull((res.data as FullOrg | null) ?? null)
    }, [])

    useEffect(() => {
        loadFull(activeOrg?.id)
    }, [activeOrg?.id, loadFull])

    const myMember = full?.members.find((m) => m.userId === meId)
    const canManage = myMember?.role === "ADMIN" || myMember?.role === "OWNER"

    // >> Room access loads only for admins of the active room.
    useEffect(() => {
        setAccess(null)
        setJoinPassword("")
        if (!canManage || !activeOrg?.id) return
        fetch("/api/org/access")
            .then((r) => (r.ok ? r.json() : null))
            .then((b) => b && setAccess(b))
            .catch(() => { })
    }, [canManage, activeOrg?.id])

    // Auto-accept guard shared by the effect below and the manual button.
    const acceptingRef = useRef(false)

    // ── CREATE ──────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        const toastId = toast.add({
            type: "loading",
            title: "Creating organization",
            description: `Setting up ${name}...`,
        })
        // >> creatorRole is ADMIN (lib/auth.ts) - the creator becomes the
        //    room's first admin and it becomes the active org right away.
        const { error } = await authClient.organization.create({ name, slug: slugify(name) })
        setCreating(false)
        if (error) {
            toast.update(toastId, {
                type: "error",
                title: "Could not create organization",
                description: error.message ?? "Please try again.",
                timeout: 6000,
            })
            return
        }
        setName("")
        await refetchOrgs()
        await refetchActive()
        // >> The server hook promoted the creator's GLOBAL role to ADMIN
        //    (lib/auth.ts organizationHooks). Refetch the session so the
        //    avatar badge and admin surfaces update immediately.
        await refetchSession()
        toast.update(toastId, {
            type: "success",
            title: "Organization created",
            description: `${name} is ready - you are now an ADMIN.`,
            timeout: 4000,
        })
    }

    // ── SWITCH (slow: session + member write + hooks refetch -> spinner+toast)
    const switchTo = async (orgId: string | null) => {
        if (!orgId || switching || orgId === activeOrg?.id) return
        const target = (orgs ?? []).find((o) => o.id === orgId)
        setSwitching(true)
        const toastId = toast.add({
            type: "loading",
            title: "Switching organization",
            description: `Activating ${target?.name ?? "room"}...`,
        })
        const { error } = await authClient.organization.setActive({ organizationId: orgId })
        setSwitching(false)
        if (error) {
            toast.update(toastId, {
                type: "error",
                title: "Switch failed",
                description: error.message ?? "Could not switch organization.",
                timeout: 6000,
            })
            return
        }
        await refetchActive()
        toast.update(toastId, {
            type: "success",
            title: "Organization switched",
            description: `Now working in ${target?.name ?? "the room"}.`,
            timeout: 4000,
        })
    }

    // ── INVITE (lib/auth.ts emails the join link) ──────────────────────────
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviting(true)
        const toastId = toast.add({
            type: "loading",
            title: "Sending invitation",
            description: `Inviting ${inviteEmail} as ${inviteRole}...`,
        })
        const { error } = await authClient.organization.inviteMember({
            email: inviteEmail.trim(),
            role: inviteRole,
            organizationId: activeOrg?.id,
        })
        setInviting(false)
        if (error) {
            toast.update(toastId, {
                type: "error",
                title: "Invite failed",
                description: error.message ?? "Could not send the invitation.",
                timeout: 6000,
            })
            return
        }
        setInviteEmail("")
        toast.update(toastId, {
            type: "success",
            title: "Invitation sent",
            description: `${inviteEmail} will receive an email with a join link.`,
            timeout: 5000,
        })
    }

    // ── ACCEPT (deep link from the invitation email) ───────────────────────
    const acceptInvite = async () => {
        if (!inviteId || acceptingRef.current) return
        acceptingRef.current = true
        setAcceptError(null)
        setAccepting(true)
        const toastId = toast.add({
            type: "loading",
            title: "Joining organization",
            description: "Accepting your invitation...",
        })
        const { error } = await authClient.organization.acceptInvitation({ invitationId: inviteId })
        setAccepting(false)
        acceptingRef.current = false
        if (error) {
            setAcceptError(error.message ?? "Could not accept the invitation.")
            toast.update(toastId, {
                type: "error",
                title: "Could not join",
                description: error.message ?? "The invitation may have expired.",
                timeout: 6000,
            })
            return
        }
        await refetchOrgs()
        await refetchActive()
        toast.update(toastId, {
            type: "success",
            title: "Welcome aboard",
            description: "You joined the organization.",
            timeout: 4000,
        })
        router.replace("/organization")
    }

    // >> AUTO-JOIN: the email's "Accept invitation" button lands here with
    //    ?invite=<id>. If the visitor is signed in, join IMMEDIATELY (no
    //    extra click) - the card below stays as the fallback for signed-out
    //    users (they sign in and are routed back with the param intact).
    const sessionReady = session !== undefined
    useEffect(() => {
        if (inviteId && sessionReady && session?.user && !acceptingRef.current) {
            acceptInvite()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inviteId, sessionReady, session?.user?.id])

    // ── MEMBER OPS (promote/demote via /api/members/role; remove via plugin) ─
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
            await loadFull(activeOrg?.id)
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

    const removeMember = async (m: MemberRow) => {
        setBusyId(m.id)
        const toastId = toast.add({
            type: "loading",
            title: "Removing member",
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
        await loadFull(activeOrg?.id)
        toast.update(toastId, {
            type: "success",
            title: "Member removed",
            description: `${m.user.email} no longer has access.`,
            timeout: 5000,
        })
    }

    // ── ROOM ACCESS ops ──────────────────────────────────────────────────────
    const updateAccess = async (payload: Record<string, unknown>, okMsg: string) => {
        setAccessBusy(true)
        const toastId = toast.add({ type: "loading", title: "Updating room access", description: "Saving..." })
        try {
            const res = await fetch("/api/org/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || "Request failed")
            setAccess(body)
            setJoinPassword("")
            toast.update(toastId, { type: "success", title: okMsg, timeout: 4000 })
        } catch (err) {
            toast.update(toastId, {
                type: "error",
                title: "Update failed",
                description: err instanceof Error ? err.message : "Please try again.",
                timeout: 6000,
            })
        } finally {
            setAccessBusy(false)
        }
    }

    // ── JOIN BY ROOM ID: preview -> confirm -> join ─────────────────────────
    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault()
        setPreview(null)
        setJoinError(null)
        setPreviewBusy(true)
        const toastId = toast.add({ type: "loading", title: "Looking up room", description: "Checking the ID..." })
        try {
            const res = await fetch("/api/org/join/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: joinCode, password: joinPw }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || "Room not found")
            setPreview(body)
            toast.update(toastId, { type: "success", title: "Room found", description: body.name, timeout: 3000 })
        } catch (err) {
            toast.update(toastId, {
                type: "error",
                title: "Room not found",
                description: "Check the ID and password and try again.",
                timeout: 5000,
            })
            setJoinError(null) // generic on purpose - no detail to leak
        } finally {
            setPreviewBusy(false)
        }
    }

    const handleJoin = async () => {
        if (!preview) return
        setJoining(true)
        setJoinError(null)
        const toastId = toast.add({ type: "loading", title: "Joining room", description: `${preview.name}...` })
        try {
            const res = await fetch("/api/org/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: joinCode, password: joinPw }),
            })
            const body = await res.json().catch(() => ({}))
            if (res.status === 409 && body.alreadyMember) {
                // >> Already a member: just make it the active room.
                await switchTo(body.organizationId)
                setPreview(null)
                setJoinCode("")
                setJoinPw("")
                return
            }
            if (!res.ok) throw new Error(body.error || "Failed to join")
            await refetchOrgs()
            await refetchActive()
            await refetchSession()
            toast.update(toastId, {
                type: "success",
                title: `Joined ${body.organizationName}`,
                description: "You are now an AGENT in this room.",
                timeout: 5000,
            })
            setPreview(null)
            setJoinCode("")
            setJoinPw("")
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to join"
            setJoinError(msg.includes("ALREADY_A_MEMBER") ? "You are already a member." : msg)
            toast.update(toastId, { type: "error", title: "Join failed", description: msg, timeout: 6000 })
        } finally {
            setJoining(false)
        }
    }

    const initialsOf = (name?: string | null, email?: string) =>
        (name || email || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

    if (inviteId) {
        // >> Deep-link from the invite email (?invite=<id>): accept-or-deny card
        return (
            <LayoutClient>
                <main className="pb-8">
                    <div className="min-h-[60svh] flex items-center justify-center">
                        <Card className="w-full max-w-sm">
                            <CardHeader className="items-center text-center">
                                <CardTitle className="text-xl">Join the room</CardTitle>
                                <CardDescription>You were invited to an organization. Signing in joins automatically.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {acceptError && <p className="text-sm text-red-600">{acceptError}</p>}
                                <Button onClick={acceptInvite} disabled={accepting} className="gap-2">
                                    {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Accept invitation
                                </Button>
                                <p className="text-sm text-muted-foreground text-center">
                                    <Link href="/tickets" className="underline underline-offset-4">Not now</Link>
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </LayoutClient>
        )
    }

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6" /> Organization
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Tickets and notes are scoped to the active room. Switch, create, invite, or join with a room ID below.
                    </p>
                </div>

                <div className="flex flex-col gap-4 mx-auto max-w-2xl">
                    {/* ── ACTIVE ORG: Select switcher + spinner while switching ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Active organization</CardTitle>
                            <CardDescription>Every ticket and note query is scoped to this room.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-2">
                            <Select
                                value={activeOrg?.id ?? null}
                                onValueChange={(v) => switchTo(v)}
                                disabled={switching || orgsLoading || activeLoading}
                            >
                                <SelectTrigger className="w-72">
                                    <SelectValue>
                                        {activeOrg?.name ?? "No active organization"}
                                    </SelectValue>
                                    {switching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </SelectTrigger>
                                {/* opens below the trigger (no item-over-trigger alignment)
                                    so the popup never covers the current value */}
                                <SelectContent alignItemWithTrigger={false}>
                                    {(orgs ?? []).map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {(orgsLoading || activeLoading) && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </CardContent>
                    </Card>

                    {/* ── CREATE ROOM ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Create a new room</CardTitle>
                            <CardDescription>You become its first ADMIN.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="flex flex-col gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="orgname">Organization name</Label>
                                    <Input id="orgname" required value={name} onChange={(e) => setName(e.target.value)}
                                        placeholder="Acme Support" />
                                </div>
                                <Button type="submit" disabled={creating || !name.trim()} className="gap-2 self-start">
                                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Create organization
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ── JOIN WITH A ROOM ID (code + optional password) ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Join with a room ID</CardTitle>
                            <CardDescription>
                                Got an ID (and password) from a teammate? Confirm the room, then join as an AGENT.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!preview ? (
                                <form onSubmit={handlePreview} className="flex flex-col gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="join-code">Room ID</Label>
                                        <Input id="join-code" required value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. 7KX2M9AB" className="font-mono tracking-widest" />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="join-pw">Password (if the room has one)</Label>
                                        <Input id="join-pw" type="password" value={joinPw}
                                            onChange={(e) => setJoinPw(e.target.value)} placeholder="Leave empty if none" />
                                    </div>
                                    <Button type="submit" disabled={previewBusy || joinCode.trim().length < 4} className="gap-2 self-start">
                                        {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                        Look up room
                                    </Button>
                                    {joinError && <p className="text-sm text-red-600">{joinError}</p>}
                                </form>
                            ) : (
                                /* ── CONFIRMATION VIEW: name + member avatars + count.
                                    Only reachable with correct credentials (the API
                                    withholds name/members otherwise). ── */
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">You are about to join</p>
                                        <p className="text-lg font-semibold">{preview.name}</p>
                                        <p className="text-sm text-muted-foreground">{preview.memberCount} members</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {preview.members.slice(0, 8).map((m) => (
                                            <span key={m.email} title={`${m.name ?? m.email} · ${m.role}`}
                                                className="relative inline-flex">
                                                <Avatar className="size-9 ring-2 ring-background">
                                                    {m.image && <AvatarImage src={m.image} alt={m.name ?? ""} />}
                                                    <AvatarFallback className="text-[10px]">{initialsOf(m.name, m.email)}</AvatarFallback>
                                                </Avatar>
                                                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-muted-foreground/40 ring-2 ring-background" />
                                            </span>
                                        ))}
                                        {preview.memberCount > 8 && (
                                            <span className="inline-flex h-9 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                                                +{preview.memberCount - 8}
                                            </span>
                                        )}
                                    </div>
                                    {preview.alreadyMember && (
                                        <p className="text-sm text-amber-600">You are already a member - joining will switch you to this room.</p>
                                    )}
                                    <div className="flex gap-2">
                                        <Button onClick={handleJoin} disabled={joining} className="gap-2">
                                            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
                                            {preview.alreadyMember ? "Switch to this room" : "Join this room"}
                                        </Button>
                                        <Button variant="outline" onClick={() => setPreview(null)} disabled={joining}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── INVITE A SEAT (ADMIN or AGENT; caps enforced server-side) ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Invite a member</CardTitle>
                            <CardDescription>
                                Up to 10 ADMINs and 1,000 AGENTs per organization. They get an email with a join link.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInvite} className="flex flex-col gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="invite-email">Email</Label>
                                    <Input id="invite-email" type="email" required value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" />
                                </div>
                                {/* >> reui c-select-1 pattern: Field-wrapped Select
                                    (label inside the field wrapper). */}
                                <Field className="max-w-xs">
                                    <Label>Role</Label>
                                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "ADMIN" | "AGENT")}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent alignItemWithTrigger={false}>
                                            <SelectGroup>
                                                <SelectItem value="AGENT">AGENT (works tickets)</SelectItem>
                                                <SelectItem value="ADMIN">ADMIN (manages the room)</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Button type="submit" disabled={inviting || !activeOrg} className="gap-2 self-start">
                                    {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    Send invitation
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ── ROOM ACCESS (admin only): share/rotate code, set password ── */}
                    {canManage && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <KeyRound className="h-4 w-4" /> Room access
                                </CardTitle>
                                <CardDescription>
                                    Share the room ID so people can join themselves. Add a password to require one.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {!access ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-lg tracking-[0.3em] bg-muted rounded-md px-3 py-1.5">
                                                {access.joinCode}
                                            </span>
                                            <Button size="sm" variant="outline" className="gap-1.5"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(access.joinCode)
                                                    toast.add({ type: "success", title: "Room ID copied", timeout: 3000 })
                                                }}>
                                                <Copy className="h-3.5 w-3.5" /> Copy
                                            </Button>
                                            <Button size="sm" variant="outline" className="gap-1.5" disabled={accessBusy}
                                                onClick={() => updateAccess({ rotateCode: true }, "New room ID generated")}>
                                                <RefreshCw className="h-3.5 w-3.5" /> Rotate
                                            </Button>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <div className="grid gap-1.5 flex-1">
                                                <Label htmlFor="room-pw">
                                                    {access.hasPassword ? "Change password" : "Set a password"}
                                                </Label>
                                                <Input id="room-pw" type="password" value={joinPassword}
                                                    onChange={(e) => setJoinPassword(e.target.value)}
                                                    placeholder={access.hasPassword ? "Password is set" : "No password (ID alone works)"} />
                                            </div>
                                            <Button size="sm" variant="outline" disabled={accessBusy || joinPassword.length < 4}
                                                onClick={() => updateAccess({ password: joinPassword }, "Password saved")}>
                                                Save
                                            </Button>
                                            {access.hasPassword && (
                                                <Button size="sm" variant="outline" disabled={accessBusy}
                                                    onClick={() => updateAccess({ password: null }, "Password removed")}>
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── MEMBERS (promote / demote / remove; emailed on role change) ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Members {full ? `(${full.members.length})` : ""}</CardTitle>
                            <CardDescription>
                                Role changes email the member; they see the new role on their next reload.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {fullLoading || (!full && activeOrg) ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : !full ? (
                                <p className="text-sm text-muted-foreground">Select an organization to see its members.</p>
                            ) : (
                                full.members.map((m) => {
                                    const isSelf = m.userId === meId
                                    return (
                                        <div key={m.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate flex items-center gap-2">
                                                    {m.user.name || m.user.email}
                                                    {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                                            </div>
                                            <Badge variant={m.role === "AGENT" ? "secondary" : "default"}>
                                                {m.role === "ADMIN" ? <ShieldCheck className="h-3 w-3 mr-1" /> : <UserIcon className="h-3 w-3 mr-1" />}
                                                {m.role}
                                            </Badge>
                                            {canManage && !isSelf && (
                                                busyId === m.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        {m.role === "AGENT" ? (
                                                            <Button size="sm" variant="outline" onClick={() => changeRole(m, "ADMIN")}>
                                                                Make admin
                                                            </Button>
                                                        ) : (
                                                            <Button size="sm" variant="outline" onClick={() => changeRole(m, "AGENT")}>
                                                                Make agent
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-600"
                                                            onClick={() => removeMember(m)}>
                                                            <UserMinus className="h-3.5 w-3.5 mr-1" /> Remove
                                                        </Button>
                                                    </>
                                                )
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </LayoutClient>
    )
}
