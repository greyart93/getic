"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {LayoutDashboard, Ticket, User, Settings} from 'lucide-react';

interface NavBarProps {
    closeSidebar?: () => void;
}

const NavContent = [[<LayoutDashboard className="w-4"/>,'Dashboard'], [<Ticket className="w-4"/>, 'Tickets'], [<User className="w-4"/> ,'Customers'], [<Settings className="w-4" /> ,'Settings']]

export default function NavBar({ closeSidebar }: NavBarProps) {
    const handleNavigation = () => {
        // Close sidebar after navigation on mobile
        if (closeSidebar) closeSidebar();
    };

    return (
        <div className="h-full flex flex-col">
            <h1 className="pb-5 font-bold">GeTiC</h1>
            <div className="text-[12px] flex flex-1 flex-col items-start gap-4 font-medium">
                {NavContent.map((val, id) => (
                    <button key={id} className="pl-2 opacity-50 hover:opacity-100 transition-opacity flex gap-2 items-center">{val[0]}{val[1]}</button>
                ))}
            </div>
            <div className=" flex items-center gap-2 border-t p-2 antialiased">
                <Avatar>
                    <AvatarImage src="https://github.com/greyart93.png" />
                    <AvatarFallback>GR</AvatarFallback>
                </Avatar>
                <p className="font-mono text-sm opacity-50">Saud Mullaji</p>
            </div>
        </div>
    );
}