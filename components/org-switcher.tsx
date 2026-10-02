"use client"

//
// ─── ORG SWITCHER (header, beside the sidebar collapse icon) ───────────────
// Same DropdownMenu pattern as the tickets toolbar's Status filter (Button
// trigger via Base UI `render` + RadioGroup items): the trigger shows the
// ACTIVE organization, opening it lists every org you belong to and lets
// admins AND agents switch their "room" from any page.
//
// Switching = authClient.organization.setActive (writes Session.
// activeOrganizationId server-side; every org-scoped query follows it) with
// the same loading toast + spinner as the org page, since the call is slow
// (session write + atoms refetch). Available to ADMIN and AGENT alike —
// both roles work inside one room at a time.

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown, Loader2 } from "lucide-react"

export function OrgSwitcher() {
    const { data: orgs, isPending: orgsLoading } = authClient.useListOrganizations()
    const { data: activeOrg, isPending: activeLoading, refetch: refetchActive } =
        authClient.useActiveOrganization()

    const [switching, setSwitching] = useState(false)
    const list = orgs ?? []

    const switchTo = async (orgId: string) => {
        if (!orgId || switching || orgId === activeOrg?.id) return
        const target = list.find((o) => o.id === orgId)
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

    return (
        <DropdownMenu>
            {/* Same trigger recipe as the Status filter: Button composed via
                Base UI `render`, label + value + chevron inside. */}
            <DropdownMenuTrigger
                render={
                    <Button variant="outline" size="sm" className="justify-between max-w-45 sm:max-w-56" disabled={switching} />
                }
            >
                <span className="flex items-center gap-1.5 min-w-0">
                    {switching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate font-medium">
                        {activeLoading ? "…" : activeOrg?.name ?? "No org"}
                    </span>
                </span>
                {switching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Your organizations</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={activeOrg?.id ?? ""}
                        onValueChange={(v) => switchTo(v as string)}
                    >
                        {list.map((org) => (
                            <DropdownMenuRadioItem key={org.id} value={org.id} className="cursor-pointer">
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="truncate">{org.name}</span>
                                    {org.id === activeOrg?.id && (
                                        <Badge variant="outline" className="rounded-sm px-1.5 font-normal text-muted-foreground">
                                            active
                                        </Badge>
                                    )}
                                </span>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                {orgsLoading && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
