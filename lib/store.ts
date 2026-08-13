// lib/store.ts
import { create } from 'zustand'
import { Ticket } from '@/app/_data/tempdata'

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
      
      // 👇 Map the data and format the date
      const formattedData = data.map((ticket: any) => ({
        ...ticket,
        date: ticket.createdAt
          ? new Date(ticket.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : ticket.date,
      }))

      set({ tickets: formattedData, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  // 2. Create a new ticket
  addTicket: async (ticketData: Partial<Ticket>) => {
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
      
      // 👇 Format the date for the new ticket
      const formattedTicket = {
        ...newTicket,
        date: newTicket.createdAt
          ? new Date(newTicket.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }),
      }

      set((state) => ({ tickets: [formattedTicket, ...state.tickets] }))
      
    } catch (error: any) {
      set({ error: error.message })
      console.error(error)
      throw error // re-throw so callers can show error toast
    }
  },


  // 3. Update status in DB and UI
  updateStatus: async (id, newStatus) => {
    // Optimistic update
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
    } catch (error: any) {
      console.error('❌ Error updating status:', error)
      set({ error: error.message })
    }
  },

  // 4. Update any fields in DB and UI (used for Edit)
  updateTicket: async (id, updates) => {
    // Optimistic update
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
    } catch (error: any) {
      console.error('❌ Error updating ticket:', error)
      set({ error: error.message })
    }
  },

  // 5. Delete single ticket in DB and UI
  deleteTicket: async (id) => {
    // Optimistic update
    set((state) => ({
      tickets: state.tickets.filter(t => t.id !== id)
    }))

    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete ticket')
    } catch (error: any) {
      console.error('❌ Error deleting ticket:', error)
      set({ error: error.message })
    }
  },

  // 6. Delete bulk tickets in DB and UI
  deleteBulkTickets: async (ids) => {
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
    } catch (error: any) {
      console.error('❌ Error deleting bulk tickets:', error)
      set({ error: error.message })
    }
  },
}))