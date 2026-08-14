"use client"

import { useState, useEffect } from "react"
import { type Ticket } from "@/app/_data/tempdata"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MessageSquarePlus, StickyNote, Clock } from "lucide-react"

interface TicketNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  onSaveNote: (ticketId: number, noteText: string) => Promise<void>
}

export function TicketNoteDialog({
  open,
  onOpenChange,
  ticket,
  onSaveNote,
}: TicketNoteDialogProps) {
  const [noteText, setNoteText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setNoteText("")
      setError("")
    }
  }, [open])

  if (!ticket) return null

  const handleSubmit = async () => {
    if (!noteText.trim()) {
      setError("Please write a note before submitting.")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      await onSaveNote(ticket.id, noteText.trim())
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to save note.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <StickyNote className="h-5 w-5" />
            <DialogTitle className="text-lg font-semibold">Add Internal Note</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground text-left">
            Add a comment or internal note for ticket <span className="font-semibold text-foreground">{ticket.ticketId || `TKT-${ticket.id}`}</span> ({ticket.subject}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="noteText" className="text-xs font-medium">
              Note Details <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="noteText"
              placeholder="e.g. Discussed with Network Team; server port configuration will be updated by 2 PM..."
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value)
                if (error) setError("")
              }}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
            {error && (
              <span className="text-xs font-medium text-destructive">{error}</span>
            )}
          </div>

          {/* Existing Notes Preview */}
          {ticket.notes && ticket.notes.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Previous Notes ({ticket.notes.length})
              </p>
              <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                {ticket.notes.map((n) => (
                  <div key={n.id} className="p-2.5 rounded border bg-muted/30 text-xs">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {n.createdAt || "Previous Note"}
                    </div>
                    <p className="whitespace-pre-wrap">{n.notesText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !noteText.trim()} className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Add Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
