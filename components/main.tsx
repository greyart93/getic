"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useMemo, useEffect } from "react" // 👈 Added useEffect
import { DataTable } from "@/app/_data/data-table"
import { columns } from "@/app/_data/columns"
import { Input } from "@/components/ui/input"
import { TicketFormDialog } from "@/components/ticket-form-dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { TicketViewDialog } from "@/components/ticket-view-dialog"
import { TicketNoteDialog } from "@/components/ticket-note-dialog"
import { Search } from "lucide-react";
import { useTicketStore } from "@/lib/store"; // 👈 Import store
import type { Ticket } from "@/app/_data/tempdata";

export default function Main() {
    // 👇 1. GET STATE AND ACTIONS FROM ZUSTAND
    const { 
        tickets, 
        isLoading, 
        fetchTickets, 
        updateStatus, 
        deleteTicket, 
        deleteBulkTickets, 
        updateTicket,
        addNoteToTicket,
    } = useTicketStore()

    // 👇 2. FETCH DATA FROM DB ON FIRST LOAD
    useEffect(() => {
        fetchTickets()
    }, [])

    const [activeTab, setActiveTab] = useState("all")
    const [globalSearch, setGlobalSearch] = useState<string>("")

    // States for Delete (shared for single and bulk)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [ticketToDelete, setTicketToDelete] = useState<number | null>(null)
    const [bulkDeleteIds, setBulkDeleteIds] = useState<number[]>([])

    // States for Edit
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null)

    // States for View
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [ticketToViewId, setTicketToViewId] = useState<number | null>(null)

    // States for Add Note
    const [noteDialogOpen, setNoteDialogOpen] = useState(false)
    const [ticketToNoteId, setTicketToNoteId] = useState<number | null>(null)

    // Derived active ticket objects so notes update live
    const ticketToView = useMemo(
        () => tickets.find((t) => t.id === ticketToViewId) || null,
        [tickets, ticketToViewId]
    )

    const ticketToNote = useMemo(
        () => tickets.find((t) => t.id === ticketToNoteId) || null,
        [tickets, ticketToNoteId]
    )

    // 1. CHANGE STATUS (Uses Zustand)
    const handleStatusChange = (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => {
        updateStatus(id, newStatus)
    }

    // 2. OPEN SINGLE DELETE DIALOG
    const handleDeleteRequest = (id: number) => {
        setTicketToDelete(id)
        setBulkDeleteIds([])
        setDeleteDialogOpen(true)
    }

    // 3. OPEN BULK DELETE DIALOG
    const handleBulkDeleteRequest = (ids: number[]) => {
        setBulkDeleteIds(ids)
        setTicketToDelete(null)
        setDeleteDialogOpen(true)
    }

    // 4. CONFIRM DELETION (Uses Zustand)
    const confirmDelete = () => {
        if (ticketToDelete !== null) {
            deleteTicket(ticketToDelete) // Single delete
        } else if (bulkDeleteIds.length > 0) {
            deleteBulkTickets(bulkDeleteIds) // Bulk delete
        }
        setDeleteDialogOpen(false)
        setTicketToDelete(null)
        setBulkDeleteIds([])
    }

    // 5. OPEN EDIT DIALOG
    const handleEditRequest = (ticket: Ticket) => {
        setTicketToEdit(ticket)
        setEditDialogOpen(true)
    }

    // 6. HANDLE EDIT SAVE (Uses Zustand)
    const handleEditSave = (data: { subject: string; customerName: string; customerEmail: string; description: string }) => {
        if (ticketToEdit) {
            updateTicket(ticketToEdit.id, data)
            setEditDialogOpen(false)
            setTicketToEdit(null)
        }
    }

    // 7. OPEN VIEW DIALOG
    const handleViewRequest = (ticket: Ticket) => {
        setTicketToViewId(ticket.id)
        setViewDialogOpen(true)
    }

    // 8. OPEN NOTE DIALOG
    const handleAddNoteRequest = (ticket: Ticket) => {
        setTicketToNoteId(ticket.id)
        setNoteDialogOpen(true)
    }

    // Live Summary Cards (Uses Zustand tickets array)
    // const cardData = useMemo(() => {
    //     const total = tickets.length;
    //     const open = tickets.filter(t => t.status === 'OPEN').length;
    //     const inProgress = tickets.filter(t => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS').length;
    //     const closed = tickets.filter(t => t.status === 'CLOSED').length;
    //     return [
    //         { title: "Total Tickets", num: total },
    //         { title: "Open", num: open },
    //         { title: 'In Progress', num: inProgress },
    //         { title: 'Closed', num: closed }
    //     ];
    // }, [tickets]);

    // 👇 STATS CALCULATION (Used for both header and filters)
    const statData = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'OPEN').length;
        const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
        const closed = tickets.filter(t => t.status === 'CLOSED').length;
        return { total, open, inProgress, closed };
        }, [tickets]);

    return (
        <main>
            {/* Summary Cards */}
            {/* <div className="hidden md:grid md:grid-cols-2 lg:flex gap-3 overflow-hidden">
                {cardData.map((v, i) => (
                    <Card key={i} title={v.title} num={v.num} />
                ))}
            </div> */}

            {/* Tabs + Search */}
            <div className="mt-5 md:mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Tabs defaultValue="all" onValueChange={setActiveTab}>
                    <TabsList variant={"pill"} className='md:py-5 md:px-1.5 py-[2px] px-[5px]'>
                        <TabsTrigger value="all" className='md:p-4  text-[12px] md:text-[14px]'>All ({statData.total})</TabsTrigger>
                        <TabsTrigger value="open" className='md:p-4 text-[12px] md:text-[14px]'>Open ({statData.open})</TabsTrigger>
                        <TabsTrigger value="in_progress" className='md:p-4 text-[12px] md:text-[14px]'>In Progress ({statData.inProgress})</TabsTrigger>
                        <TabsTrigger value="closed" className='md:p-4 text-[12px] md:text-[14px]'>Closed ({statData.closed})</TabsTrigger>

                    </TabsList>
                </Tabs>
                <div className="w-full sm:w-auto">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID, Subject, Customer..."
                            value={globalSearch}
                            onChange={(event) => setGlobalSearch(event.target.value)}
                            className="h-10 bg-background w-full sm:w-75 pl-9"
                        />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="w-full mt-4 overflow-hidden">
                {isLoading ? (
                    <div className="rounded-md border overflow-hidden">
                        {/* Skeleton header */}
                        <div className="bg-gray-200 dark:bg-[#0f0f11] px-4 py-3 flex gap-6 border-b">
                            {[80, 120, 160, 100, 90, 40].map((w, i) => (
                                <div key={i} className="h-4 rounded animate-pulse bg-muted-foreground/20" style={{ width: w }} />
                            ))}
                        </div>
                        {/* Skeleton rows */}
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="px-4 py-3.5 flex items-center gap-6 border-b last:border-0">
                                <div className="h-4 w-5 rounded animate-pulse bg-muted-foreground/15" />
                                <div className="h-4 w-20 rounded animate-pulse bg-muted-foreground/15" />
                                <div className="h-4 w-30 rounded animate-pulse bg-muted-foreground/15" />
                                <div className="h-4 w-40 rounded animate-pulse bg-muted-foreground/15" />
                                <div className="h-5 w-24 rounded-full animate-pulse bg-muted-foreground/15" />
                                <div className="h-4 w-22 rounded animate-pulse bg-muted-foreground/15" />
                                <div className="ml-auto h-6 w-6 rounded animate-pulse bg-muted-foreground/15" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <DataTable 
                        columns={columns} 
                        data={tickets} 
                        filterStatus={activeTab} 
                        globalSearch={globalSearch}
                        onStatusChange={handleStatusChange}
                        onDeleteTicket={handleDeleteRequest}
                        onEditTicket={handleEditRequest}
                        onViewTicket={handleViewRequest}
                        onAddNoteTicket={handleAddNoteRequest}
                        onBulkDelete={handleBulkDeleteRequest}
                        // 👇 PASS STATS TO THE TABLE
                        headerStats={statData}

                    />
                )}
            </div>

            {/* 👇 REUSABLE DELETE CONFIRMATION DIALOG */}
            <DeleteConfirmDialog 
                open={deleteDialogOpen} 
                onOpenChange={setDeleteDialogOpen} 
                onConfirm={confirmDelete}
                itemCount={bulkDeleteIds.length > 0 ? bulkDeleteIds.length : (ticketToDelete ? 1 : 0)}
            />

            {/* 👇 REUSABLE EDIT DIALOG */}
            <TicketFormDialog 
                open={editDialogOpen} 
                onOpenChange={setEditDialogOpen} 
                initialData={ticketToEdit} 
                onSave={handleEditSave}
            />

            {/* 👇 DETAILED VIEW DIALOG */}
            <TicketViewDialog 
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
                ticket={ticketToView}
                onAddNote={addNoteToTicket}
            />

            {/* 👇 ADD NOTE DIALOG */}
            <TicketNoteDialog 
                open={noteDialogOpen}
                onOpenChange={setNoteDialogOpen}
                ticket={ticketToNote}
                onSaveNote={addNoteToTicket}
            />
        </main>
    )
}

// function Card({ title, num }: { title: string, num: number }) {
//     return (
//         <div className="p-2 md:p-3 border rounded-xl flex-1 min-w-20">
//             <p className="text-[10px] md:text-[13px] font-light pb-4">{title}</p>
//             <h5 className="p-1 text-xl md:text-2xl font-bold">{num}</h5>
//         </div>
//     )
// }