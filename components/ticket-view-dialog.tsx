"use client"

import { useState } from "react"
import { type Ticket } from "@/app/_data/tempdata"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageSquare, Calendar, User, Mail, Hash, Clock, Plus, Send } from "lucide-react"

interface TicketViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  onAddNote?: (ticketId: number, notesText: string) => Promise<void>
}

export function TicketViewDialog({
  open,
  onOpenChange,
  ticket,
  onAddNote,
}: TicketViewDialogProps) {
  const [newNote, setNewNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!ticket) return null

  const getStatusVariant = (status: string) => {
    if (status === "OPEN") return "default"
    if (status === "IN PROGRESS" || status === "IN_PROGRESS") return "green"
    return "destructive"
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || !onAddNote || isSubmitting) return

    try {
      setIsSubmitting(true)
      await onAddNote(ticket.id, newNote.trim())
      setNewNote("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <button className="sr-only" aria-hidden="true" tabIndex={0}>Focus catcher</button>
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {ticket.ticketId || `TKT-${String(ticket.id).padStart(3, '0')}`}
              </span>
              <Badge variant={getStatusVariant(ticket.status)}>
                {ticket.status === 'IN_PROGRESS' ? 'IN PROGRESS' : ticket.status}
              </Badge>
            </div>
          </div>
          <DialogTitle className="text-xl font-bold mt-2 text-left">
            {ticket.subject}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-left">
            Detailed information and internal note history for this support ticket.
          </DialogDescription>
        </DialogHeader>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-sm">
          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/50">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Database ID</p>
              <p className="font-semibold">{ticket.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/50">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Ticket ID</p>
              <p className="font-semibold">{ticket.ticketId || `TKT-${String(ticket.id).padStart(3, '0')}`}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/50">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Customer Name</p>
              <p className="font-semibold">{ticket.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/50">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Customer Email</p>
              <p className="font-semibold truncate">{ticket.customerEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/50">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Date Created</p>
              <p className="font-semibold">{ticket.createdAt || ticket.date || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/50">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Date Updated</p>
              <p className="font-semibold">{ticket.updatedAt || ticket.createdAt || ticket.date || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Description Section */}
        {ticket.description && (
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground">Description</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>
        )}

        {/* Notes & Comments Section */}
        <div className="border-t pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Internal Notes ({ticket.notes?.length || 0})</h4>
            </div>
          </div>

          {/* Add Note Form inside View */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <textarea
              placeholder="Write an internal note or update..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              className="flex-1 min-h-[50px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={!newNote.trim() || isSubmitting}
              className="self-end gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Post Note
            </Button>
          </form>

          {/* Notes History List */}
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 mt-1">
            {ticket.notes && ticket.notes.length > 0 ? (
              ticket.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border bg-card text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-medium text-foreground/80">Note #{note.id}</span>
                    <span>{note.createdAt || "Just now"}</span>
                  </div>
                  <p className="text-foreground text-sm whitespace-pre-wrap">{note.notesText}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 border rounded-lg bg-muted/10 text-muted-foreground text-xs">
                No internal notes added to this ticket yet. Write a note above to collaborate with your team.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
