"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useMemo } from "react" 
import { tickets as initialTickets, type Ticket } from "@/app/_data/tempdata"
import { DataTable } from "@/app/_data/data-table"
import { columns } from "@/app/_data/columns"

export default function Main() {
    const [activeTab, setActiveTab] = useState("all")
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets)

    const handleStatusChange = (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => {
        setTickets(prevTickets => 
            prevTickets.map(ticket => 
                ticket.id === id ? { ...ticket, status: newStatus } : ticket
            )
        )
    }

    // 👇 DYNAMICALLY CALCULATE NUMBERS BASED ON THE CURRENT TICKETS STATE
    const cardData = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'OPEN').length;
        const inProgress = tickets.filter(t => t.status === 'IN PROGRESS').length;
        const closed = tickets.filter(t => t.status === 'CLOSED').length;

        return [
            { title: "Total Tickets", num: total },
            { title: "Open", num: open },
            { title: 'In Progress', num: inProgress },
            { title: 'Closed', num: closed }
        ];
    }, [tickets]); // 👈 Recalculates whenever 'tickets' changes

    return (
        <main>
            {/* Summary Cards */}
            <div className="md:flex gap-3 overflow-hidden hidden">
                {cardData.map((v, i) => (
                    <Card key={i} title={v.title} num={v.num} />
                ))}
            </div>

            {/* Tabs */}
            <div className="mt-10">
                <Tabs defaultValue="all" onValueChange={setActiveTab}>
                    <TabsList variant={"pill"} className='py-5 px-1.5'>
                        <TabsTrigger value="all" className='p-4'>All</TabsTrigger>
                        <TabsTrigger value="open" className='p-4'>Open</TabsTrigger>
                        <TabsTrigger value="in_progress" className='p-4'>In Progress</TabsTrigger>
                        <TabsTrigger value="closed" className='p-4'>Closed</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Data Table */}
            <div className="w-[90vw] sm:w-full mt-4">
                <DataTable 
                    columns={columns} 
                    data={tickets} 
                    filterStatus={activeTab} 
                    onStatusChange={handleStatusChange}
                />
            </div>
        </main>
    )
}

function Card({ title, num }: { title: string, num: number }) {
    return (
        <div className="p-2 md:p-3 border rounded-xl flex-1 min-w-[80px]">
            <p className="text-[10px] md:text-[13px] font-light pb-4">{title}</p>
            <h5 className="p-1 text-xl md:text-2xl font-bold">{num}</h5>
        </div>
    )
}