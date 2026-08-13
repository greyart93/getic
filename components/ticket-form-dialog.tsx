"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { type Ticket } from "@/app/_data/tempdata"

// Shadcn UI Components
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Zod Schema
const TicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
})

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Ticket | null
  onSave: (data: { subject: string; customerName: string; customerEmail: string }) => void
}

export function TicketFormDialog({ 
  open, 
  onOpenChange, 
  initialData, 
  onSave 
}: TicketFormDialogProps) {
  const [subject, setSubject] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (initialData) {
        setSubject(initialData.subject || "")
        setCustomerName(initialData.customerName || "")
        setCustomerEmail(initialData.customerEmail || "")
      } else {
        setSubject("")
        setCustomerName("")
        setCustomerEmail("")
      }
      setErrors({})
    }
  }, [open, initialData])

  const handleSubmit = () => {
    setErrors({})

    const result = TicketSchema.safeParse({
      subject,
      customerName,
      customerEmail,
    })

    if (!result.success) {
      const formattedErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0] as string] = issue.message
        }
      })
      setErrors(formattedErrors)
      return
    }

    onSave(result.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {initialData ? "Edit Ticket" : "Create New Ticket"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {initialData 
              ? "Update the details for this ticket below." 
              : "Enter details to log a new customer support ticket."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject" className="text-xs font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="e.g. Navigation menu not responding"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={errors.subject ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.subject && (
              <span className="text-xs font-medium text-destructive">{errors.subject}</span>
            )}
          </div>

          {/* Customer Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer" className="text-xs font-medium">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer"
              placeholder="e.g. John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={errors.customerName ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.customerName && (
              <span className="text-xs font-medium text-destructive">{errors.customerName}</span>
            )}
          </div>

          {/* Customer Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Customer Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={errors.customerEmail ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.customerEmail && (
              <span className="text-xs font-medium text-destructive">{errors.customerEmail}</span>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {initialData ? "Save Changes" : "Create Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}