//
// ─── SIDEBAR NAVIGATION ────────────────────────────────────────────────
// Simple config-driven nav. Active link detection via usePathname()
// comparison — Tickets lives at /tickets, Dashboard at /dashboard.
// Also closes the mobile sidebar after navigating (closeSidebar callback
// passed down from layout.tsx).

"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, Ticket, User, Settings, Building2, Users, Bell } from 'lucide-react';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { authClient, useSession } from "@/lib/auth-client";
import { useEffectiveRole } from "@/lib/use-effective-role";
import { UserMenu } from "./user-menu";
import Image from "next/image";

interface NavBarProps {
    closeSidebar?: () => void;
}

// 👇 Add new pages here; commented-out entries are future scope
const NavContent = [
    { icon: <LayoutDashboard className="w-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <Ticket className="w-4" />, label: 'Tickets', href: '/tickets' },
    { icon: <User className="w-4" />, label: 'Customers', href: '/customers' },
    { icon: <Building2 className="w-4" />, label: 'Organization', href: '/organization' },
    { icon: <Users className="w-4" />, label: 'Team', href: '/admin/users' },
    { icon: <Bell className="w-4" />, label: 'Notifications', href: '/notifications' },
    { icon: <Settings className="w-4" />, label: 'Settings', href: '/settings' },
];

export default function NavBar({ closeSidebar }: NavBarProps) {
    const pathname = usePathname();

    // Session role gates the sidebar user menu (ADMIN only); the org hook
    // feeds the "which room am I working in" chip under the logo. Both are
    // reactive authClient atoms - shared with the org page, no extra fetches.
    const { data: session } = useSession();
    // >> Org-aware: the sidebar account menu only appears while the ACTIVE
    //    room makes you an admin (a global admin working in another room as
    //    an agent gets no admin menu here).
    const { role } = useEffectiveRole();
    const { data: activeOrg, isPending: orgPending } = authClient.useActiveOrganization();

    const handleNavigation = () => {
        if (closeSidebar) closeSidebar();
    };

    return (
        <div className="h-full flex flex-col">
            {/* <h1 className="pb-5 font-bold">GeTiC</h1> */}
            {/* true intrinsic ratio + explicit CSS size (both dimensions)
                - one-sided CSS sizing trips the next/image aspect warning */}
            <Image loading="eager" src={'/icon.webp'} alt={'Getic'} width={2000} height={562} className="pb-5 w-[100px] h-auto logo-invert cursor-pointer" />

            {/* ACTIVE ORGANIZATION chip - tells admin AND agent which room
                every ticket/note query is scoped to. Click goes to the org
                page (switch/create). Skeleton pulse while the atom loads. */}
            <Link
                href="/organization"
                onClick={handleNavigation}
                className="mb-5 flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2 transition-colors hover:bg-muted/70"
            >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-left">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-3">Active org</p>
                    <p className="truncate text-xs font-medium">
                        {orgPending ? (
                            <span className="inline-block h-3 w-20 animate-pulse rounded bg-muted-foreground/20 align-middle" />
                        ) : (
                            activeOrg?.name ?? "None selected"
                        )}
                    </p>
                </div>
            </Link>

            {/* 👇 UPDATED: Larger text on mobile, small text on desktop */}
            <div className="text-base md:text-[12px] flex flex-1 flex-col items-start gap-5 md:gap-4 font-medium">
                {NavContent.map((item, id) => (
                    <Link
                        key={id}
                        href={item.href}
                        onClick={handleNavigation}
                        className={`pl-2 transition-opacity flex gap-3 md:gap-2 items-center ${pathname === item.href ? 'opacity-100 font-bold' : 'opacity-50 hover:opacity-100'}`}
                    >
                        <span className="md:hidden">{item.icon}</span>
                        <span className="hidden md:block">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </div>

            {/* ADMIN-only: sidebar account menu (manage users / sign out).
                Agents get no user menu here - that is the requirement. */}
            {role === "ADMIN" && (
                <div className="flex items-center gap-2 border-t p-3">
                    <UserMenu />
                    <span className="text-xs font-medium text-muted-foreground truncate">
                        {session?.user?.name}
                    </span>
                </div>
            )}

            {/* Footer Section */}
            <div className="flex items-center gap-3 border-t p-3 antialiased group transition-colors duration-200">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Link
                                href="https://github.com/greyart93/getic"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleNavigation}
                                className="flex items-center gap-3 rounded-full hover:bg-white/5 px-2 -ml-1 transition-all duration-200 cursor-pointer"
                            >
                                {/* Avatar with Glimmer */}
                                <Avatar className="relative z-0 transition-all duration-500">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full blur-[1px] opacity-70 group-hover:opacity-100 animate-[spin_3s_linear_infinite] z-[-1]" />
                                    {/* local copy of the GitHub avatar: remote
                                        fetches get their cookies rejected in
                                        cross-site contexts (console noise) */}
                                    <AvatarImage src="/avatars/saud.png" className="rounded-full bg-background" />
                                    <AvatarFallback>GR</AvatarFallback>
                                </Avatar>

                                {/* 👇 UPDATED: Responsive font size */}
                                <p className="font-playwrite text-[12px] md:text-[10px]
    bg-gradient-to-r 
    from-slate-800 via-slate-600 to-slate-400        /* 👈 Light mode colors (Dark -> Medium) */
    dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 /* 👈 Dark mode colors (Light Gray) */
    bg-clip-text text-transparent 
    transition-all duration-300" 
>
    Saud Mullaji
</p>

                            </Link>
                        </TooltipTrigger>

                        {/* Tooltip Content */}
                        <TooltipContent sideOffset={5} side="top" className="text-sm font-medium shadow-md px-3 py-2">
                         <p className="flex items-center gap-1.5">
                                Made with <span className="text-red-500">❤️</span> by <i className="font-serif font-extralight tracking-tight">Saud Mullaji</i>
    </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}