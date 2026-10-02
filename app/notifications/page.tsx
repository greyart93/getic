"use client"

//
// ─── NOTIFICATIONS PAGE (/notifications) ────────────────────────────────────
// One inbox for everything that happened around you in Getic:
//
//   • INVITATIONS — live pending invites for your email, each with an Accept
//     button (join straight from here — flow D). Sourced from the Invitation
//     table so an invite sent BEFORE you had an account still shows up.
//   • ACTIVITY — the news feed of every room you belong to: invites sent and
//     accepted, join-by-ID, role changes, ticket created, status changes,
//     notes. Newest first, capped at 100 (the API's take).
//
// Auth: wrapped in LayoutClient → AuthGate (signed-in users only). Tenancy:
// the API scopes everything server-side from the session.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { authClient, useSession } from "@/lib/auth-client"
import LayoutClient from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { formatDateTime } from "@/lib/datetime"
import {
    Loader2, Bell, Mail, UserPlus, ShieldCheck, UserMinus, Ticket as TicketIcon,
    ArrowRightLeft, StickyNote, Building2, DoorOpen, Ban, Inbox,
} from "lucide-react"

type FeedEvent = {
    id: string
    type: string
    title: string
    description: string
    actorName: string | null
    organizationName: string | null
    createdAt: string
}

type FeedInvite = {
    id: string
    organizationId: string
    organizationName: string
    role: string
    inviterName: string
    expiresAt: string
    createdAt: string
}

// >> Icon + tint per event type — the quick-scan layer of the feed.
const EVENT_META: Record<string, { icon: React.ReactNode; tint: string }> = {
    INVITE_SENT: { icon: <Mail className="h-3.5 w-3.5" />, tint: "text-blue-500 bg-blue-500/10" },
    INVITE_ACCEPTED: { icon: <UserPlus className="h-3.5 w-3.5" />, tint: "text-emerald-500 bg-emerald-500/10" },
    INVITE_CANCELED: { icon: <Ban className="h-3.5 w-3.5" />, tint: "text-amber-500 bg-amber-500/10" },
    JOINED_VIA_CODE: { icon: <DoorOpen className="h-3.5 w-3.5" />, tint: "text-emerald-500 bg-emerald-500/10" },
    ORG_CREATED: { icon: <Building2 className="h-3.5 w-3.5" />, tint: "text-violet-500 bg-violet-500/10" },
    ROLE_CHANGED: { icon: <ShieldCheck className="h-3.5 w-3.5" />, tint: "text-violet-500 bg-violet-500/10" },
    MEMBER_REMOVED: { icon: <UserMinus className="h-3.5 w-3.5" />, tint: "text-red-500 bg-red-500/10" },
    TICKET_CREATED: { icon: <TicketIcon className="h-3.5 w-3.5" />, tint: "text-blue-500 bg-blue-500/10" },
    STATUS_CHANGED: { icon: <ArrowRightLeft className="h-3.5 w-3.5" />, tint: "text-amber-500 bg-amber-500/10" },
    NOTE_ADDED: { icon: <StickyNote className="h-3.5 w-3.5" />, tint: "text-slate-500 bg-slate-500/10" },
}

export default function NotificationsPage() {
    const { data: session } = useSession()
    const myEmail = session?.user?.email

    const [events, setEvents] = useState<FeedEvent[]>([])
    const [invites, setInvites] = useState<FeedInvite[]>([])
    const [loading, setLoading] = useState(true)
    const [acceptingId, setAcceptingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) {
                const body = await res.json()
                setEvents(body.events ?? [])
                setInvites(body.invites ?? [])
            }
        } catch { /* non-fatal */ } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const acceptInvite = async (inv: FeedInvite) => {
        setAcceptingId(inv.id)
        const toastId = toast.add({
            type: "loading",
            title: "Joining organization",
            description: `Accepting the invite to ${inv.organizationName}...`,
        })
        const { error } = await authClient.organization.acceptInvitation({ invitationId: inv.id })
        setAcceptingId(null)
        if (error) {
            toast.update(toastId, {
                type: "error",
                title: "Could not join",
                description: error.message ?? "The invitation may have expired.",
                timeout: 6000,
            })
            load()
            return
        }
        toast.update(toastId, {
            type: "success",
            title: `Welcome to ${inv.organizationName}`,
            timeout: 4000,
        })
        load()
    }

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="h-6 w-6" /> Notifications
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Invitations waiting for you, and everything that happened in your rooms.
                    </p>
                </div>

                <div className="flex flex-col gap-4 mx-auto max-w-2xl">
                    {/* ── INVITATIONS (live, with Accept) ── */}
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {invites.length > 0 && (
                                <Card className="border-primary/30">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-primary" /> Your invitations
                                        </CardTitle>
                                        <CardDescription>
                                            These are waiting for {myEmail}. Accepting joins the room immediately.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        {invites.map((inv) => (
                                            <div key={inv.id} className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">{inv.organizationName}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        as {inv.role} · invited by {inv.inviterName} · {formatDateTime(inv.createdAt)}
                                                    </p>
                                                </div>
                                                <Button size="sm" onClick={() => acceptInvite(inv)} disabled={acceptingId === inv.id} className="gap-2">
                                                    {acceptingId === inv.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                    Accept
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* ── ACTIVITY FEED ── */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Inbox className="h-4 w-4" /> Activity
                                    </CardTitle>
                                    <CardDescription>
                                        Invites, joins, role changes, tickets and notes across your rooms.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col">
                                    {events.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            Nothing yet — invite a teammate or create a ticket to get things moving.
                                        </p>
                                    ) : (
                                        events.map((e) => {
                                            const meta = EVENT_META[e.type] ?? { icon: <Bell className="h-3.5 w-3.5" />, tint: "text-muted-foreground bg-muted" }
                                            return (
                                                <div key={e.id} className="flex gap-3 border-b border-border/40 py-3 last:border-b-0 last:pb-0">
                                                    <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.tint}`}>
                                                        {meta.icon}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium leading-snug">{e.title}</p>
                                                        <p className="text-xs text-muted-foreground leading-snug">{e.description}</p>
                                                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                            {e.organizationName && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{e.organizationName}</Badge>}
                                                            <span>{formatDateTime(e.createdAt)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </CardContent>
                            </Card>

                            {invites.length === 0 && events.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Expecting an invite? It appears here automatically once it is sent to your address.{" "}
                                    <Link href="/welcome" className="underline underline-offset-4">Set up your workspace</Link>
                                </p>
                            )}
                        </>
                    )}
                </div>
            </main>
        </LayoutClient>
    )
}
