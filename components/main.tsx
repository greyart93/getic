//
// ─── MAIN TICKETS PAGE (the whole UI orchestrator) ─────────────────────
// Owns: the toolbar, the data table, and ALL four dialogs. It is the only
// place that connects the table's meta callbacks to the zustand store.
// Dialogs live here (not inside the table) so their state survives
// pagination/sorting changes and they can be reused elsewhere.
//
// ── TOOLBAR (shadcn "Tasks" example pattern) ──
//   [ Search…  (×)]  [Status ▾ (faceted, with counts)]  [View ▾ (columns)]  [Reset]
// - Search: matches ticketId/subject/customer across ALL tickets (instant —
//   they're already in memory); shows an ✕ to clear (the example's "Reset"
//   affordance).
// - Status: MULTI-select checkboxes with live counts derived from the full
//   local array — a badge always equals what the filter will show.
//   Empty selection = no filter.
// - View: show/hide table columns (Customer / Status / Date) via TanStack's
//   controlled columnVisibility state.
// - Reset: appears only when a filter is active; clears everything.
//
// Rendering pipeline: zustand tickets -> this component -> DataTable ->
// columns.tsx cells -> callbacks come back through table `meta` -> zustand
// actions. Everything else in the UI is a leaf.

"use client"

import { useState, useMemo, useEffect } from "react"
import { DataTable } from "@/app/_data/data-table"
import { columns } from "@/app/_data/columns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TicketFormDialog } from "@/components/ticket-form-dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { TicketViewDialog } from "@/components/ticket-view-dialog"
import { TicketNoteDialog } from "@/components/ticket-note-dialog"
import { Search, X, CircleCheck, SlidersHorizontal, Eye, ChevronDown, Filter } from "lucide-react";
import { useTicketStore } from "@/lib/store"; // 👈 Import store
import { OnlineAgents } from "@/components/online-agents";
import type { Ticket } from "@/app/_data/tempdata";

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Main() {
    // ── 1. STORE HOOKUP ──
    // Subscribes this component to the zustand store: any tickets state change
    // re-renders here, and the actions below are the ONLY way we mutate data.
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

    // ── 2. FIRST LOAD: pull everything from the DB (the only fetch call) ──
    // Empty dep array = once per mount. Subsequent "freshness" comes from the
    // optimistic updates in the store, not re-fetching. Filter, search and
    // pagination are all instant local operations on this full array.
    useEffect(() => {
        fetchTickets()
    }, [])

    // ── LOCAL UI STATE (stays local — no reason to put it in the store) ──
    const [globalSearch, setGlobalSearch] = useState<string>("") // search box text
    // 👇 Toolbar filter state (shadcn Tasks pattern)
    const [statusFilter, setStatusFilter] = useState<string[]>([]) // multi-select; [] = no filter
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({}) // View menu

    // ── FACETED STATUS FILTER (with live counts) ──
    // Counts derive from the store's FULL tickets array — the same source the
    // table filters, so a badge always equals exactly what the filter will
    // show. Toggling is pure local state: zero network, instant re-render.
    const statusOptions = useMemo(() => [
        { value: "OPEN", label: "Open", count: tickets.filter(t => t.status === 'OPEN').length },
        { value: "IN_PROGRESS", label: "In Progress", count: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN PROGRESS').length },
        { value: "CLOSED", label: "Closed", count: tickets.filter(t => t.status === 'CLOSED').length },
    ], [tickets]);

    const toggleStatusFilter = (value: string) => {
        setStatusFilter(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        )
    }

    // "Reset" shows only when something is actually filtered (Tasks example rule)
    const isFiltered = statusFilter.length > 0 || globalSearch.trim() !== ""
    const resetFilters = () => {
        setStatusFilter([])
        setGlobalSearch("")
    }

    // ── DIALOG STATE ──
    // One dialog = `open` flag + "which ticket" id. Delete is SHARED between
    // single and bulk: exactly one of ticketToDelete / bulkDeleteIds is set.
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

    // ── DERIVED TICKET OBJECTS ──
    // Dialogs only remember ticket IDs, and we re-look-up the full object from
    // the store on every render. WHY: after an optimistic update (e.g. adding
    // a note) the store's ticket object is REPLACED — a stored snapshot would
    // go stale, but this derive keeps open dialogs live.
    const ticketToView = useMemo(
        () => tickets.find((t) => t.id === ticketToViewId) || null,
        [tickets, ticketToViewId]
    )

    const ticketToNote = useMemo(
        () => tickets.find((t) => t.id === ticketToNoteId) || null,
        [tickets, ticketToNoteId]
    )

    // ── CALLBACKS: called by table cells via `meta`, delegate to zustand ──

    // 1. CHANGE STATUS (from the status dropdown in a row)
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

    return (
        <main>
            {/* Summary Cards */}
            {/* <div className="hidden md:grid md:grid-cols-2 lg:flex gap-3 overflow-hidden">
                {cardData.map((v, i) => (
                    <Card key={i} title={v.title} num={v.num} />
                ))}
            </div> */}

            {/* WHO'S ONLINE (admin only): teammates of the ACTIVE org.
                Hover the group to expand avatars; hover one for the email. */}
            <div className="flex justify-end">
                <OnlineAgents />
            </div>

            {/* ── TOOLBAR (shadcn Tasks pattern): search + faceted filter + view + reset ── */}
            <div className="mt-5 md:mt-4 flex sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search — with the ✕ clear affordance from the example */}
                <div className="relative w-full sm:w-75">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by ID, Subject, Customer..."
                        value={globalSearch}
                        onChange={(event) => setGlobalSearch(event.target.value)}
                        className="h-10 bg-background w-full pl-9 pr-9"
                    />
                    {globalSearch && (
                        <button
                            onClick={() => setGlobalSearch("")}
                            className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* MOBILE-ONLY combined filters menu: everything the Status
                    and View dropdowns offer, behind one filter icon to the
                    right of the search bar (those two are hidden on mobile
                    - three stacked dropdowns did not fit). */}
                <div className="sm:hidden shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="outline" className="h-10 w-10 justify-center p-0 relative" aria-label="Filters" />
                            }
                        >
                            <Filter className="h-4 w-4" />
                            {statusFilter.length > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                                    {statusFilter.length}
                                </span>
                            )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                                {statusOptions.map((option) => (
                                    <DropdownMenuCheckboxItem
                                        key={option.value}
                                        checked={statusFilter.includes(option.value)}
                                        onCheckedChange={() => toggleStatusFilter(option.value)}
                                        closeOnClick={false}
                                    >
                                        <span className="flex-1 flex items-center justify-between gap-2">
                                            {option.label}
                                            <Badge variant="outline" className="rounded-sm px-1.5 font-normal text-muted-foreground">
                                                {option.count}
                                            </Badge>
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                {["customerName", "status", "date"].map((colId) => {
                                    const labels: Record<string, string> = {
                                        customerName: "Customer", status: "Status", date: "Date",
                                    }
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={colId}
                                            checked={columnVisibility[colId] !== false}
                                            onCheckedChange={(checked) =>
                                                setColumnVisibility(prev => ({ ...prev, [colId]: !!checked }))
                                            }
                                            closeOnClick={false}
                                        >
                                            {labels[colId]}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                            </DropdownMenuGroup>
                            {isFiltered && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={resetFilters}>
                                        <SlidersHorizontal className="h-4 w-4" />
                                        Reset all
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Separator orientation="vertical" className="hidden sm:block !h-10" />

                {/* Faceted status filter — checkbox items + count badges.
                    Shows ONE selected value on the trigger (Tasks pattern),
                    or N selected for multi, or the plain label when empty. */}
                <DropdownMenu>
                    {/* Base UI note: the trigger composes a custom element via the
                        `render` prop (Radix's asChild equivalent) */}
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="lg" className="border-dashed justify-between w-full sm:w-auto hidden sm:flex" />
                        }
                    >
                        <span className="flex items-center gap-2">
                            <CircleCheck className="h-4 w-4" />
                            Status
                        </span>
                        {statusFilter.length === 1 ? (
                            <Badge variant="outline" className="rounded-sm px-1.5 font-normal">
                                {statusOptions.find(o => o.value === statusFilter[0])?.label}
                            </Badge>
                        ) : statusFilter.length > 1 ? (
                            <Badge variant="outline" className="rounded-sm px-1.5 font-normal">
                                {statusFilter.length} selected
                            </Badge>
                        ) : (
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        {/* Base UI: a GroupLabel (what DropdownMenuLabel renders)
                            is only valid INSIDE a group — so label + items are
                            wrapped together. */}
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                            {statusOptions.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={statusFilter.includes(option.value)}
                                    onCheckedChange={() => toggleStatusFilter(option.value)}
                                    closeOnClick={false}
                                >
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        {option.label}
                                        {/* Count badge — derived from the full local array,
                                            so it always matches what the filter will show */}
                                        <Badge variant="outline" className="rounded-sm px-1.5 font-normal text-muted-foreground">
                                            {option.count}
                                        </Badge>
                                    </span>
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuGroup>
                        {statusFilter.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setStatusFilter([])}>
                                    <X className="h-4 w-4" />
                                    Clear filter
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* View — show/hide columns (TanStack controlled visibility).
                    columnIds must match columns.tsx: ticketId, subject,
                    customerName, status, date. */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="lg" className="justify-between w-full sm:w-auto hidden sm:flex" />
                        }
                    >
                        <span className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {/* Base UI: GroupLabel must live inside a group */}
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                            {["customerName", "status", "date"].map((colId) => {
                                const labels: Record<string, string> = {
                                    customerName: "Customer", status: "Status", date: "Date",
                                }
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={colId}
                                        checked={columnVisibility[colId] !== false} // undefined = visible
                                        onCheckedChange={(checked) =>
                                            setColumnVisibility(prev => ({ ...prev, [colId]: !!checked }))
                                        }
                                        closeOnClick={false}
                                    >
                                        {labels[colId]}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Reset — only visible while a filter is active (Tasks pattern) */}
                {isFiltered && (
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={resetFilters}
                        className="border-dashed justify-center"
                    >
                        Reset
                        <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Data Table */}
            <div className="w-full mt-4 overflow-hidden">
                {isLoading ? (
                    // ── LOADING SKELETON: fake header + 5 rows, pulse animation ──
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
                        search={globalSearch}
                        statusFilter={statusFilter}
                        columnVisibility={columnVisibility}
                        onColumnVisibilityChange={setColumnVisibility}
                        onStatusChange={handleStatusChange}
                        onDeleteTicket={handleDeleteRequest}
                        onEditTicket={handleEditRequest}
                        onViewTicket={handleViewRequest}
                        onAddNoteTicket={handleAddNoteRequest}
                        onBulkDelete={handleBulkDeleteRequest}
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