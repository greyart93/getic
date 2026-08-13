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

// 👇 1. Zod Schema (same for both)
const TicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Invalid email address"),
})

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Ticket | null // If provided, we are in "Edit" mode. If null, we are in "Create" mode.
  onSave: (data: { subject: string; customer_name: string; customer_email: string }) => void
}

export function TicketFormDialog({ 
  open, 
  onOpenChange, 
  initialData, 
  onSave 
}: TicketFormDialogProps) {
  // 👇 2. State for the form fields
  const [subject, setSubject] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 👇 3. Reset form or populate with existing data when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        // EDIT MODE: Populate fields
        setSubject(initialData.subject)
        setCustomerName(initialData.customer_name)
        setCustomerEmail(initialData.customer_email)
      } else {
        // CREATE MODE: Reset fields
        setSubject("")
        setCustomerName("")
        setCustomerEmail("")
      }
      setErrors({}) // Clear errors when opening
    }
  }, [open, initialData])

  // 👇 4. Handle Submit
  const handleSubmit = () => {
    setErrors({})

    const result = TicketSchema.safeParse({
      subject,
      customer_name: customerName,
      customer_email: customerEmail,
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

    // ✅ Success: Pass data up to parent
    onSave(result.data)
    onOpenChange(false) // Close the dialog
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Ticket" : "Create New Ticket"}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Make changes to the ticket details below." 
              : "Fill in the details to create a new support ticket."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Input
                id="subject"
                placeholder="e.g. UI bug"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <span className="text-xs text-red-500">{errors.subject}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer" className="text-right">
              Customer
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Input
                id="customer"
                placeholder="e.g. John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={errors.customer_name ? "border-red-500" : ""}
              />
              {errors.customer_name && (
                <span className="text-xs text-red-500">{errors.customer_name}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={errors.customer_email ? "border-red-500" : ""}
              />
              {errors.customer_email && (
                <span className="text-xs text-red-500">{errors.customer_email}</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? "Save Changes" : "Create Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}