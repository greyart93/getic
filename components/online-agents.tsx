"use client"

//
// ─── ONLINE AGENTS (admin-only avatar group) ───────────────────────────────
// Shows which agents/admins of YOUR active organization are online right
// now. Admins see it on the tickets page and the users page.
//
// Polling/heartbeat lives in the shared hook (lib/use-presence.ts) so the
// Team page can read the same list without double-beating.
//
// RENDER RULES:
//   - Avatars are CAPPED AT 5; everyone else collapses into a "+N" chip
//     whose tooltip names the hidden members.
//   - Collapsed: avatars overlap (only the avatars - the count text sits
//     OUTSIDE the overlap wrapper, so it can never hide underneath).
//   - Hover the group: avatars expand to full size (profile pictures show).
//   - Hover one avatar: Tooltip with the member's email.

import { useState } from "react"
import { useSession } from "@/lib/auth-client"
import { usePresence } from "@/lib/use-presence"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const MAX_SHOWN = 5

export function OnlineAgents() {
    const { data: session } = useSession()
    const meId = session?.user?.id
    const { online, enabled } = usePresence({ beat: true })

    const [expanded, setExpanded] = useState(false)

    // >> Requirement: only ADMINS see the avatar group. Non-admins render
    //    nothing at all (the hook does not even beat for them).
    if (!enabled) return null
    if (online.length === 0) return null

    const shown = online.slice(0, MAX_SHOWN)
    const hidden = online.slice(MAX_SHOWN)
    const overflow = hidden.length

    const initialsOf = (u: { name: string; email: string }) =>
        (u.name || u.email || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

    return (
        <TooltipProvider delay={200}>
            <div
                data-slot="online-agents"
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
                className="flex items-center gap-2"
            >
                {/* Overlap applies to the avatars ONLY, so the "+N" chip and
                    the count text can never slide underneath them. */}
                <span className={cn("flex items-center transition-all duration-300", expanded ? "gap-1.5" : "-space-x-2")}>
                    {shown.map((u) => (
                        <Tooltip key={u.id}>
                            <TooltipTrigger
                                render={<span className="relative inline-flex rounded-full ring-2 ring-background" />}
                            >
                                <Avatar className={cn("transition-all duration-300", expanded ? "size-9" : "size-7")}>
                                    {u.image && <AvatarImage src={u.image} alt={u.name} />}
                                    <AvatarFallback className="text-[10px]">{initialsOf(u)}</AvatarFallback>
                                </Avatar>
                                {/* green dot = online (everyone in the list is) */}
                                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <span className="font-medium">{u.name}</span>
                                <span className="opacity-80"> · {u.email}</span>
                                {u.id === meId && <span className="opacity-60"> (you)</span>}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </span>

                {overflow > 0 && (
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <span className="z-10 inline-flex h-7 items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground ring-2 ring-background cursor-default" />
                            }
                        >
                            +{overflow}
                        </TooltipTrigger>
                        {/* "specify more ones": name everyone behind the cap */}
                        <TooltipContent side="bottom" className="max-w-56">
                            <p className="mb-1 font-medium">Also online</p>
                            {hidden.map((u) => (
                                <p key={u.id} className="truncate opacity-80">
                                    {u.name || u.email}
                                    {u.id === meId && <span className="opacity-60"> (you)</span>}
                                </p>
                            ))}
                        </TooltipContent>
                    </Tooltip>
                )}

                <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {online.length} online
                </span>
            </div>
        </TooltipProvider>
    )
}
