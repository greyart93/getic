//
// ─── ZUSTAND STORE: THE APP'S SINGLE SOURCE OF TRUTH ──────────────────────
// Every component reads tickets from here and every mutation flows through
// here. There is no other state layer — React Query is not used.
//
// THE DATA FLOW for any mutation (create/update/delete):
//   1. Component calls an action below (e.g. useTicketStore().addTicket(...))
//   2. The action fires the fetch() to the matching /api/... route
//   3. On success it set()s the updated tickets array -> all subscribed
//      components re-render automatically
//   4. A toast shows loading -> success/error feedback
//
// WHY ZUSTAND (vs Redux/Context)?
//   - One `create()` call, no providers, no reducers, no dispatch boilerplate
//   - Components subscribe with selectors, so only the pieces they use trigger
//     re-renders
//
// DATES: state always holds RAW ISO UTC strings exactly as the API returns
// them. Formatting happens at render time in the components via
// lib/datetime.ts, never here. (See the "optimistic update" notes below —
// they are the most interview-worthy part of this file.)

import { create } from 'zustand'
import { Ticket } from '@/app/_data/tempdata'
import { toast } from '@/components/ui/toast'

interface TicketStore {
  // ── State ──
  tickets: Ticket[]        // raw ISO dates, newest first (API order)
  isLoading: boolean       // true while fetchTickets is in flight
  error: string | null     // last error message (for error UI)

  // ── Actions ──
  fetchTickets: () => Promise<void>
  addTicket: (ticketData: Partial<Ticket>) => Promise<void>
  updateStatus: (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => void
  updateTicket: (id: number, updates: Partial<Ticket>) => void
  deleteTicket: (id: number) => void
  deleteBulkTickets: (ids: number[]) => void
  addNoteToTicket: (ticketId: number, notesText: string) => Promise<void>
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  tickets: [],
  isLoading: false,
  error: null,

  // 1. FETCH — the only "read" action. Called once on page load (from
  // components/main.tsx useEffect). Everything after that mutates local
  // state optimistically instead of re-fetching the whole list.
  fetchTickets: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/tickets')
      if (!res.ok) throw new Error('Failed to fetch tickets')
      const data = await res.json()

      // 👇 Dates stay as raw ISO UTC strings — components format them at
      // render time (see lib/datetime.ts) so users see their own timezone
      set({ tickets: data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  // 2. CREATE — the toast lifecycle here is the pattern used by every action:
  //    loading toast -> await API -> morph same toast into success (or error).
  //    The toast.update(toastId, ...) call REPLACES the loading spinner in place.
  addTicket: async (ticketData: Partial<Ticket>) => {
    const toastId = toast.add({
      type: 'loading',
      title: 'Creating Ticket',
      description: 'Saving new ticket details...',
    })

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketData.subject || "Placeholder",
          customerName: ticketData.customerName,
          customerEmail: ticketData.customerEmail,
          description: ticketData.description || 'Created from UI',
        }),
      })
      if (!res.ok) throw new Error('Failed to create ticket')

      // 👇 API responds with the full row (including server-generated id,
      //    ticketId code and createdAt) so we can prepend the REAL ticket —
      //    no placeholder guessing, no refetch needed.
      const newTicket = await res.json()

      // Prepend because GET /api/tickets is newest-first
      set((state) => ({ tickets: [newTicket, ...state.tickets] }))

      toast.update(toastId, {
        type: 'success',
        title: 'Ticket Created',
        description: `Ticket ${newTicket.ticketId || ''} created successfully!`,
        timeout: 3000,
      })
    } catch (error: any) {
      set({ error: error.message })
      toast.update(toastId, {
        type: 'error',
        title: 'Failed to Create Ticket',
        description: error.message || 'Something went wrong while creating ticket.',
        timeout: 4000,
      })
      throw error // re-throw so callers can catch if needed
    }
  },


  // 3. STATUS CHANGE (dropdown in the table row) — OPTIMISTIC UPDATE example.
  //    Order of operations matters:
  //    a) show loading toast
  //    b) set() the new status IMMEDIATELY -> UI updates instantly (optimistic)
  //    c) fire PATCH in the background
  //    d) on success: sync the real updatedAt from the response
  //    e) on failure: the row just keeps its old status in the DB — a refetch
  //       (fetchTickets) would resync; we surface the error via toast instead.
  //    Trade-off to articulate in an interview: instant perceived speed vs.
  //    a small window where local state differs from the database.
  updateStatus: async (id, newStatus) => {
    const toastId = toast.add({
      type: 'loading',
      title: 'Updating Status',
      description: `Updating status to ${newStatus}...`,
    })

    // Optimistic update (updatedAt refreshed from the API response)
    set((state) => ({
      tickets: state.tickets.map(t =>
        t.id === id ? { ...t, status: newStatus } : t
      )
    }))

    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update ticket status')

      const updated = await res.json()

      set((state) => ({
        tickets: state.tickets.map(t =>
          t.id === id ? { ...t, updatedAt: updated.updatedAt } : t
        )
      }))

      toast.update(toastId, {
        type: 'success',
        title: 'Status Updated',
        description: `Ticket status set to ${newStatus}.`,
        timeout: 3000,
      })
    } catch (error: any) {
      console.error('❌ Error updating status:', error)
      set({ error: error.message })
      toast.update(toastId, {
        type: 'error',
        title: 'Failed to Update Status',
        description: error.message || 'Could not update status.',
        timeout: 4000,
      })
    }
  },

  // 4. EDIT (used by the edit dialog) — same optimistic pattern as updateStatus,
  //    but spreads ALL submitted fields into the local row, then replaces the
  //    row with the authoritative API response ({ ...t, ...updated }).
  updateTicket: async (id, updates) => {
    const toastId = toast.add({
      type: 'loading',
      title: 'Updating Ticket',
      description: 'Saving ticket updates...',
    })

    // Optimistic update (updatedAt refreshed from the API response)
    set((state) => ({
      tickets: state.tickets.map(t =>
        t.id === id ? { ...t, ...updates } : t
      )
    }))

    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update ticket')

      const updated = await res.json()

      set((state) => ({
        tickets: state.tickets.map(t =>
          t.id === id ? { ...t, ...updated, updatedAt: updated.updatedAt } : t
        )
      }))

      toast.update(toastId, {
        type: 'success',
        title: 'Ticket Updated',
        description: 'Ticket details updated successfully!',
        timeout: 3000,
      })
    } catch (error: any) {
      console.error('❌ Error updating ticket:', error)
      set({ error: error.message })
      toast.update(toastId, {
        type: 'error',
        title: 'Failed to Update Ticket',
        description: error.message || 'Could not save updates.',
        timeout: 4000,
      })
    }
  },

  // 5. DELETE ONE — optimistic: remove from local state first, then DELETE.
  //    Note: the server cascades the ticket's notes (schema.prisma) — nothing
  //    to clean up client-side.
  deleteTicket: async (id) => {
    const toastId = toast.add({
      type: 'loading',
      title: 'Deleting Ticket',
      description: 'Removing ticket from database...',
    })

    // Optimistic update
    set((state) => ({
      tickets: state.tickets.filter(t => t.id !== id)
    }))

    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete ticket')

      toast.update(toastId, {
        type: 'success',
        title: 'Ticket Deleted',
        description: 'Ticket deleted successfully.',
        timeout: 3000,
      })
    } catch (error: any) {
      console.error('❌ Error deleting ticket:', error)
      set({ error: error.message })
      toast.update(toastId, {
        type: 'error',
        title: 'Failed to Delete Ticket',
        description: error.message || 'Could not delete ticket.',
        timeout: 4000,
      })
    }
  },

  // 6. BULK DELETE — driven by the table's checkbox toolbar (see
  //    app/_data/data-table.tsx). One DELETE /api/tickets with { ids: [...] }.
  deleteBulkTickets: async (ids) => {
    const count = ids.length
    const toastId = toast.add({
      type: 'loading',
      title: 'Deleting Tickets',
      description: `Deleting ${count} selected ticket(s)...`,
    })

    // Optimistic update
    set((state) => ({
      tickets: state.tickets.filter(t => !ids.includes(t.id))
    }))

    try {
      const res = await fetch('/api/tickets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to delete bulk tickets')

      toast.update(toastId, {
        type: 'success',
        title: 'Tickets Deleted',
        description: `${count} ticket(s) deleted successfully.`,
        timeout: 3000,
      })
    } catch (error: any) {
      console.error('❌ Error deleting bulk tickets:', error)
      set({ error: error.message })
      toast.update(toastId, {
        type: 'error',
        title: 'Failed to Delete Tickets',
        description: error.message || 'Could not delete selected tickets.',
        timeout: 4000,
      })
    }
  },

  // 7. ADD NOTE — has a FALLBACK ROUTE: it tries POST /api/notes first and,
  //    if that endpoint ever fails, retries POST /api/tickets/{id}/notes
  //    (they write to the same table). Then splices the new note into the
  //    local ticket's notes array (front, because notes are newest-first).
  addNoteToTicket: async (ticketId: number, notesText: string) => {
    const toastId = toast.add({
      type: 'loading',
      title: 'Adding Note',
      description: 'Posting internal note to ticket...',
    })

    try {
      let res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, notesText }),
      })

      if (!res.ok) {
        res = await fetch(`/api/tickets/${ticketId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notesText }),
        })
      }

      if (!res.ok) throw new Error('Failed to add note')
      const newNote = await res.json()

      // 👇 Touch updatedAt locally too, since the server bumps it for the
      //    note. Raw ISO string — never a formatted display string.
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? {
              ...t,
              updatedAt: new Date().toISOString(),
              notes: [newNote, ...(t.notes || [])],
            }
            : t
        ),
      }))

      toast.update(toastId, {
        type: 'success',
        title: 'Note Added',
        description: 'Internal note saved successfully!',
        timeout: 3000,
      })
    } catch (error: any) {
      console.error('❌ Error adding note:', error)
      set({ error: error.message })
      toast.update(toastId, {
        type: 'error',
        title: 'Failed to Add Note',
        description: error.message || 'Could not post internal note.',
        timeout: 4000,
      })
      throw error
    }
  },
}))