"use client"

//
// ─── USER MENU (header avatar dropdown) ────────────────────────────────────
// The signed-in identity chip in the header: avatar + name + role badge,
// with a dropdown for Admin-only links and Sign out. Rendered by
// components/layout.tsx next to the theme toggle.
//
// Data source: authClient.useSession() — Better Auth's reactive session hook
// (re-renders on sign-in/out/role change; no zustand needed — auth state is
// server truth, unlike the tickets cache).

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuGroup,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { authClient, useSession } from "@/lib/auth-client"
import { useEffectiveRole } from "@/lib/use-effective-role"
import { LogOut, Users, ShieldCheck } from "lucide-react"
import Link from "next/link"

export function UserMenu() {
    // isPending = session cookie still being checked (avoid flash of logged-out)
    const { data, isPending } = useSession()
    const user = data?.user

    // Signed out (or pending): render nothing — the AuthGate handles the
    // redirect to /login; this chip only exists for the signed-in state.
    if (isPending || !user) return null

    // >> EFFECTIVE role: the seat role in the ACTIVE org (OWNER/ADMIN shown
    //    as ADMIN), falling back to the global role before any org is active.
    //    A global admin visiting another room as an agent correctly shows
    //    AGENT here - privilege is per-room.
    const { role: effRole } = useEffectiveRole()
    const role = effRole ?? (user as { role?: string }).role ?? "AGENT"
    const initials = (user.name || user.email || "?")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()

    const handleSignOut = async () => {
        await authClient.signOut()
        window.location.href = "/login" // full reload clears client caches
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="flex items-center gap-2 rounded-full outline-none cursor-pointer"
                aria-label="Account menu"
            >
                <Avatar>
                    {/* user.image is set by OAuth providers (Google/GitHub avatar) */}
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                        <span className="truncate font-medium">{user.name}</span>
                        <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <div className="px-2 py-1.5 flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                            {role}
                        </Badge>
                        {!user.emailVerified && (
                            <span className="text-[10px] text-muted-foreground">email unverified</span>
                        )}
                    </div>
                </DropdownMenuGroup>
                {/* ADMIN-only: the user-management page */}
                {role === "ADMIN" && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            {/* 👇 Base UI menus: no asChild — use `render` to swap the
                                rendered element while keeping menu behavior */}
                            <DropdownMenuItem
                                className="cursor-pointer"
                                render={<Link href="/admin/users" />}
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Manage users
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
