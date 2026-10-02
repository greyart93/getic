"use client"

//
// ─── usePresence (who is online in the ACTIVE org) ─────────────────────────
// Shared polling hook for the presence feature:
//   - POSTs a heartbeat to /api/presence every 25s while mounted (any page
//     using it keeps the viewer "online", org-scoped).
//   - GETs the online list every 25s. "Online" = lastSeenAt within 60s
//     (server window); a closed tab disappears within ~a minute.
//   - Re-beats + re-reads when the active organization changes (switching
//     rooms moves your Presence row and swaps the list).
//
// Consumers:
//   - components/online-agents.tsx (admin avatar group, beats + reads)
//   - app/admin/users/page.tsx (Team table reads only - pass beat: false so
//     a page mount never fakes "online" for someone who is just browsing).
//
// GATE: by default only admins of the active room get data (the avatar
// group rule). Pass requireAdmin: false for read-only consumers like the
// Team table's online tags - the server permits any org member to read.

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { useEffectiveRole } from "@/lib/use-effective-role"

export type OnlineUser = {
    id: string
    name: string
    email: string
    image?: string | null
    role?: string
    lastSeenAt?: string
}

export function usePresence({ beat = true, requireAdmin = true }: { beat?: boolean; requireAdmin?: boolean } = {}) {
    // >> Effective (org) role decides whether this consumer may see presence.
    const { role: effRole } = useEffectiveRole()
    const enabled = requireAdmin ? effRole === "ADMIN" : effRole === "ADMIN" || effRole === "AGENT"
    const activeOrgId = authClient.useActiveOrganization().data?.id

    const [online, setOnline] = useState<OnlineUser[]>([])

    useEffect(() => {
        if (!enabled) {
            setOnline([])
            return
        }
        const controller = new AbortController()

        const beatOnce = () =>
            fetch("/api/presence", { method: "POST", signal: controller.signal }).catch(() => { })
        const read = async () => {
            try {
                const res = await fetch("/api/presence", { signal: controller.signal })
                if (!res.ok) return
                const body = await res.json()
                setOnline(body.online ?? [])
            } catch { /* offline blip - next poll retries */ }
        }

        if (beat) beatOnce()
        read()
        if (beat) {
            const beatId = setInterval(beatOnce, 25_000)
            const readId = setInterval(read, 25_000)
            return () => {
                controller.abort()
                clearInterval(beatId)
                clearInterval(readId)
            }
        }
        const readId = setInterval(read, 25_000)
        return () => {
            controller.abort()
            clearInterval(readId)
        }
    }, [enabled, activeOrgId, beat])

    return { online, enabled }
}
