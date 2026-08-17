"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, Ticket, User, Settings } from 'lucide-react';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import Image from "next/image";

interface NavBarProps {
    closeSidebar?: () => void;
}

const NavContent = [
    { icon: <LayoutDashboard className="w-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <Ticket className="w-4" />, label: 'Tickets', href: '/' },
    // { icon: <User className="w-4"/>, label: 'Customers', href: '#' }, 
    // { icon: <Settings className="w-4" />, label: 'Settings', href: '#' }
];

export default function NavBar({ closeSidebar }: NavBarProps) {
    const pathname = usePathname();

    const handleNavigation = () => {
        if (closeSidebar) closeSidebar();
    };

    return (
        <div className="h-full flex flex-col">
            {/* <h1 className="pb-5 font-bold">GeTiC</h1> */}
            <Image loading="eager" src={'/icon.webp'} alt={'GeTiC'} width={100} height={10} className="pb-5 logo-invert cursor-pointer" />

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
                                    <AvatarImage src="https://github.com/greyart93.png" className="rounded-full bg-background" />
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