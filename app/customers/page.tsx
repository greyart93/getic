//
// ─── CUSTOMERS (/customers) ────────────────────────────────────────────────
// A contact book built ENTIRELY from the tickets table — no Customer model.
// GET /api/tickets already returns every ticket (the zustand store holds the
// whole array), so customers are DERIVED client-side by grouping on the
// customer's email: zero new API surface, zero extra fetches, and the page
// updates instantly whenever a ticket changes (same store as the table).
//
// If a real CRM is ever needed, the grouping key (email) and this shape are
// the migration path: a Customer table would just pre-aggregate the same rows.
//
// DATES: formatted client-side via lib/datetime.ts (viewer's timezone — the
// long-standing project rule; never format server-side).

"use client"

import { useEffect, useMemo, useState } from "react"
import { useTicketStore } from "@/lib/store"
import LayoutClient from "@/components/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Search, Mail } from "lucide-react"
import { formatDate } from "@/lib/datetime"

type CustomerSummary = {
    email: string
    name: string
    total: number
    open: number
    inProgress: number
    closed: number
    lastTicketAt: string | null
    lastSubject: string | null
}

const initialsOf = (name: string, email: string) =>
    (name || email || "?")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()

export default function CustomersPage() {
    const { tickets, fetchTickets, isLoading } = useTicketStore()
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchTickets()
    }, [])

    // ── DERIVED: group tickets by customer email (one pass, newest-first) ──
    // Tickets arrive ordered createdAt desc, so the FIRST occurrence of an
    // email carries that customer's newest name/subject/date; older rows only
    // backfill fields the newest row left empty.
    const customers = useMemo<CustomerSummary[]>(() => {
        const byEmail = new Map<string, CustomerSummary>()
        for (const t of tickets) {
            const key = (t.customerEmail || t.customerName || "unknown").toLowerCase()
            let c = byEmail.get(key)
            if (!c) {
                c = {
                    email: t.customerEmail || t.customerName || "unknown",
                    name: t.customerName || "",
                    total: 0,
                    open: 0,
                    inProgress: 0,
                    closed: 0,
                    lastTicketAt: t.createdAt || null,
                    lastSubject: t.subject || null,
                }
                byEmail.set(key, c)
            }
            c.name = t.customerName || c.name // newest non-empty name wins
            c.total += 1
            // UI spells it "IN PROGRESS", the API enum is "IN_PROGRESS" — accept both
            if (t.status === "OPEN") c.open += 1
            else if (t.status === "CLOSED") c.closed += 1
            else c.inProgress += 1
        }
        return [...byEmail.values()].sort((a, b) => b.total - a.total)
    }, [tickets])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return customers
        return customers.filter(
            (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        )
    }, [customers, search])

    const stats = useMemo(() => {
        const top = customers[0]
        return {
            customers: customers.length,
            open: customers.reduce((n, c) => n + c.open, 0),
            inProgress: customers.reduce((n, c) => n + c.inProgress, 0),
            topName: top?.name || "—",
            topCount: top?.total ?? 0,
        }
    }, [customers])

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-sm text-muted-foreground">
                        Everyone who has ever filed a ticket, grouped by email address.
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="border rounded-xl p-4 h-28 animate-pulse bg-muted/10" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Stat cards — same neutral shadcn pattern as the dashboard */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 border rounded-xl bg-card">
                                <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
                                    <Users className="size-3.5" /> Customers
                                </div>
                                <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">{stats.customers}</p>
                                <p className="text-xs text-muted-foreground mt-1">unique email addresses</p>
                            </div>
                            <div className="p-4 border rounded-xl bg-card">
                                <div className="text-xs md:text-sm font-medium text-muted-foreground">Open tickets</div>
                                <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">{stats.open}</p>
                                <p className="text-xs text-muted-foreground mt-1">awaiting first response</p>
                            </div>
                            <div className="p-4 border rounded-xl bg-card">
                                <div className="text-xs md:text-sm font-medium text-muted-foreground">In progress</div>
                                <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">{stats.inProgress}</p>
                                <p className="text-xs text-muted-foreground mt-1">being worked on right now</p>
                            </div>
                            <div className="p-4 border rounded-xl bg-card">
                                <div className="text-xs md:text-sm font-medium text-muted-foreground">Most active</div>
                                <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">{stats.topCount}</p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">tickets — {stats.topName}</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email…"
                                className="pl-9"
                            />
                        </div>

                        {/* Customer cards */}
                        {filtered.length === 0 ? (
                            <div className="border rounded-xl p-10 text-center text-sm text-muted-foreground">
                                {customers.length === 0
                                    ? "No customers yet — they appear here as soon as tickets are created."
                                    : `No customers match "${search}".`}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filtered.map((c) => (
                                    <Card key={c.email} className="py-4 gap-0">
                                        <CardContent className="flex items-start gap-3">
                                            <Avatar>
                                                <AvatarFallback>{initialsOf(c.name, c.email)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium truncate">{c.name || "Unnamed"}</p>
                                                    <span className="text-sm font-semibold tabular-nums shrink-0">
                                                        {c.total} {c.total === 1 ? "ticket" : "tickets"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                                    <Mail className="size-3 shrink-0" />
                                                    {c.email}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    {c.open > 0 && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {c.open} open
                                                        </Badge>
                                                    )}
                                                    {c.inProgress > 0 && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {c.inProgress} in progress
                                                        </Badge>
                                                    )}
                                                    {c.closed > 0 && (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            {c.closed} closed
                                                        </Badge>
                                                    )}
                                                </div>
                                                {c.lastSubject && (
                                                    <p className="mt-2 text-xs text-muted-foreground truncate">
                                                        Last: {c.lastSubject} · {formatDate(c.lastTicketAt)}
                                                    </p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </LayoutClient>
    )
}
