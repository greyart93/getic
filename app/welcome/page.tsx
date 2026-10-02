"use client"

//
// ─── WELCOME / ONBOARDING (/welcome) ───────────────────────────────────────
// Shown when a signed-in user has NO organization yet (fresh signups — the
// auto personal-org was removed, see lib/auth.ts — and invitees who have not
// accepted anything yet).
//
// FLOW-AWARE (flows A & B):
//   • A pending invitation for this address takes over the screen as the
//     hero card — "You're invited to X — Accept". Create/join hides behind
//     a small "create or join instead" link so the invited path stays the
//     obvious one. This is the card an invitee sees after signing in with
//     the invited email (signup validates the same-email rule upstream).
//   • No pending invite → the two-card setup: CREATE a room (become its
//     ADMIN) or JOIN by Room ID + password (preview → confirm → join).
//
// Routing: /organization redirects here while the user has no orgs, and the
// LayoutClient org gate bounces org-less users here from every other page.
// After create/join/accept the user is sent to /organization (switcher).
// Signed-out visitors are bounced to /login?next=/welcome by AuthGate.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/toast"
import LayoutClient from "@/components/layout"
import { Loader2, Building2, DoorOpen, Mail, Users, Check, ArrowRight } from "lucide-react"

type RoomPreview = {
    name: string
    memberCount: number
    members: { name?: string | null; email: string; image?: string | null; role: string }[]
    alreadyMember: boolean
}

type PendingInvite = {
    id: string
    organizationName: string
    role: string
    inviterName?: string | null
}

const initialsOf = (name?: string | null, email?: string) =>
    (name || email || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

export default function WelcomePage() {
    const router = useRouter()
    const { data: session } = useSession()
    const myEmail = session?.user?.email?.toLowerCase()

    const { data: orgs, isPending: orgsLoading, refetch: refetchOrgs } = authClient.useListOrganizations()
    const { refetch: refetchActive } = authClient.useActiveOrganization()
    const { refetch: refetchSession } = useSession()

    const hasOrgs = (orgs ?? []).length > 0
    const checked = !orgsLoading // list atom resolved

    // ── CREATE ──
    const [name, setName] = useState("")
    const [creating, setCreating] = useState(false)

    // ── JOIN ──
    const [joinCode, setJoinCode] = useState("")
    const [joinPw, setJoinPw] = useState("")
    const [preview, setPreview] = useState<RoomPreview | null>(null)
    const [previewBusy, setPreviewBusy] = useState(false)
    const [joining, setJoining] = useState(false)

    // ── PENDING INVITES ──
    const [invites, setInvites] = useState<PendingInvite[]>([])
    const [invitesLoading, setInvitesLoading] = useState(true)
    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    // >> Flow B: with a pending invite, THIS screen is the accept-invitation
    //    card; create/join hides behind a "create or join instead" link so
    //    the invited path stays front and center.
    const [showSetup, setShowSetup] = useState(false)

    // >> Pending invitations for MY email: the plugin's listInvitations is
    //    admin-scoped, so a tiny custom route reads Invitation rows addressed
    //    to me (server-side email match from the session - no spoofing).
    const loadInvites = useCallback(async () => {
        if (!myEmail) return
        try {
            const res = await fetch("/api/my-invitations")
            if (res.ok) {
                const body = await res.json()
                setInvites(body.invitations ?? [])
            }
        } catch { /* non-fatal */ } finally {
            setInvitesLoading(false)
        }
    }, [myEmail])

    useEffect(() => {
        loadInvites()
    }, [loadInvites])

    // >> Already have rooms (e.g. landed here later)? Straight to the switcher.
    useEffect(() => {
        if (checked && hasOrgs) router.replace("/organization")
    }, [checked, hasOrgs, router])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        const toastId = toast.add({ type: "loading", title: "Creating your workspace", description: `Setting up ${name}...` })
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org"
        const { error } = await authClient.organization.create({ name, slug })
        setCreating(false)
        if (error) {
            toast.update(toastId, { type: "error", title: "Could not create the organization", description: error.message ?? "Please try again.", timeout: 6000 })
            return
        }
        await refetchOrgs()
        await refetchActive()
        await refetchSession()
        toast.update(toastId, { type: "success", title: "Workspace ready", description: `${name} - you are the ADMIN.`, timeout: 4000 })
        router.replace("/organization")
    }

    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault()
        setPreview(null)
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
        } catch {
            toast.update(toastId, { type: "error", title: "Room not found", description: "Check the ID and password.", timeout: 5000 })
        } finally {
            setPreviewBusy(false)
        }
    }

    const handleJoin = async () => {
        if (!preview) return
        setJoining(true)
        const toastId = toast.add({ type: "loading", title: "Joining room", description: `${preview.name}...` })
        try {
            const res = await fetch("/api/org/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: joinCode, password: joinPw }),
            })
            const body = await res.json().catch(() => ({}))
            if (res.status === 409 && body.alreadyMember) {
                await authClient.organization.setActive({ organizationId: body.organizationId })
                await refetchActive()
                router.replace("/organization")
                return
            }
            if (!res.ok) throw new Error(body.error || "Failed to join")
            await refetchOrgs()
            await refetchActive()
            await refetchSession()
            toast.update(toastId, { type: "success", title: `Joined ${body.organizationName}`, timeout: 5000 })
            router.replace("/organization")
        } catch (err) {
            toast.update(toastId, { type: "error", title: "Join failed", description: err instanceof Error ? err.message : "Try again.", timeout: 6000 })
        } finally {
            setJoining(false)
        }
    }

    const acceptInvite = async (invitationId: string) => {
        setAcceptingId(invitationId)
        const toastId = toast.add({ type: "loading", title: "Joining organization", description: "Accepting your invitation..." })
        const { error } = await authClient.organization.acceptInvitation({ invitationId })
        setAcceptingId(null)
        if (error) {
            toast.update(toastId, { type: "error", title: "Could not join", description: error.message ?? "The invitation may have expired.", timeout: 6000 })
            loadInvites()
            return
        }
        await refetchOrgs()
        await refetchActive()
        toast.update(toastId, { type: "success", title: "Welcome aboard", timeout: 4000 })
        router.replace("/organization")
    }

    // >> The FIRST pending invite drives the hero card (flows A & B).
    const heroInvite = invites[0]
    const inviteMode = !invitesLoading && !!heroInvite && !showSetup

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mx-auto max-w-2xl flex flex-col gap-4">
                    <div className="mb-2 flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Building2 className="h-6 w-6" /> Welcome to Getic
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create a workspace for your team, or join one with an invite link or a room ID.
                        </p>
                    </div>

                    {/* ── HERO: the pending invitation (flows A & B) ── */}
                    {inviteMode && heroInvite && (
                        <Card className="border-primary/40 shadow-lg shadow-primary/5">
                            <CardHeader className="items-center text-center pb-4">
                                <span className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Mail className="h-5 w-5" />
                                </span>
                                <CardTitle className="text-lg">You&apos;re invited to {heroInvite.organizationName}</CardTitle>
                                <CardDescription>
                                    {heroInvite.inviterName ? `${heroInvite.inviterName} invited you` : "You were invited"} to join
                                    as {heroInvite.role}. Accept to enter the room — it becomes your active workspace.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-3">
                                <Button size="lg" className="gap-2 w-full max-w-xs" onClick={() => acceptInvite(heroInvite.id)} disabled={acceptingId === heroInvite.id}>
                                    {acceptingId === heroInvite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Accept invitation
                                </Button>
                                <button type="button" onClick={() => setShowSetup(true)}
                                    className="text-xs text-muted-foreground underline underline-offset-4 cursor-pointer">
                                    create or join a workspace instead
                                </button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── EXTRA INVITES (beyond the hero) ── */}
                    {inviteMode && invites.length > 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> More invitations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                {invites.slice(1).map((inv) => (
                                    <div key={inv.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{inv.organizationName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                as {inv.role}{inv.inviterName ? ` · invited by ${inv.inviterName}` : ""}
                                            </p>
                                        </div>
                                        <Button size="sm" onClick={() => acceptInvite(inv.id)} disabled={acceptingId === inv.id} className="gap-2">
                                            {acceptingId === inv.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                            Accept
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── SETUP: create / join (suppressed while the invite card leads) ── */}
                    {!inviteMode && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* ── CREATE ── */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Create an organization</CardTitle>
                                    <CardDescription>For your company or team. You become its first ADMIN.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreate} className="flex flex-col gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="orgname">Organization name</Label>
                                            <Input id="orgname" required value={name} onChange={(e) => setName(e.target.value)}
                                                placeholder="Acme Support" />
                                        </div>
                                        <Button type="submit" disabled={creating || !name.trim()} className="gap-2">
                                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                                            Create organization
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* ── JOIN (ID + password -> confirmation) ── */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Join an organization</CardTitle>
                                    <CardDescription>Enter the room ID and password a teammate shared.</CardDescription>
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
                                                <Label htmlFor="join-pw">Password (if set)</Label>
                                                <Input id="join-pw" type="password" value={joinPw}
                                                    onChange={(e) => setJoinPw(e.target.value)} placeholder="Leave empty if none" />
                                            </div>
                                            <Button type="submit" variant="outline" disabled={previewBusy || joinCode.trim().length < 4} className="gap-2">
                                                {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
                                                Look up room
                                            </Button>
                                        </form>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">You are about to join</p>
                                                <p className="text-base font-semibold">{preview.name}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                    <Users className="h-3.5 w-3.5" /> {preview.memberCount} members
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {preview.members.slice(0, 6).map((m) => (
                                                    <span key={m.email} title={`${m.name ?? m.email} · ${m.role}`} className="relative inline-flex">
                                                        <Avatar className="size-8 ring-2 ring-background">
                                                            {m.image && <AvatarImage src={m.image} alt={m.name ?? ""} />}
                                                            <AvatarFallback className="text-[10px]">{initialsOf(m.name, m.email)}</AvatarFallback>
                                                        </Avatar>
                                                    </span>
                                                ))}
                                                {preview.memberCount > 6 && (
                                                    <span className="inline-flex h-8 items-center rounded-full bg-muted px-2 text-xs text-muted-foreground">
                                                        +{preview.memberCount - 6}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={handleJoin} disabled={joining} className="gap-2 flex-1">
                                                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                                    Join
                                                </Button>
                                                <Button variant="outline" onClick={() => setPreview(null)} disabled={joining}>Back</Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {inviteMode && showSetup && (
                        <p className="text-center text-xs text-muted-foreground">
                            The invitation for <b>{heroInvite?.organizationName}</b> stays on your{" "}
                            <Link href="/notifications" className="underline underline-offset-4">Notifications</Link> tab.
                        </p>
                    )}

                    <p className="text-center text-xs text-muted-foreground">
                        Expecting an email invite? It appears here automatically once you are signed in with that address.{" "}
                        <Link href="/notifications" className="underline underline-offset-4">Notifications</Link>
                    </p>
                </div>
            </main>
        </LayoutClient>
    )
}
