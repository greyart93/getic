import { create } from 'zustand'
import { Ticket } from '@/app/_data/tempdata'
import { toast } from '@/components/ui/toast'

interface TicketStore {
  tickets: Ticket[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTickets: () => Promise<void>
  addTicket: (ticketData: Partial<Ticket>) => Promise<void> // ✅ Changed to Partial
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

  // 1. Fetch from Database
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

  // 2. Create a new ticket
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

      const newTicket = await res.json()

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


  // 3. Update status in DB and UI
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

  // 4. Update any fields in DB and UI (used for Edit)
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

  // 5. Delete single ticket in DB and UI
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

  // 6. Delete bulk tickets in DB and UI
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

  // 7. Add note to a ticket
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