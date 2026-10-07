"use client"

// ─── TICKET CREATE/EDIT DIALOG ──────────────────────────────────────────
// Shared by the header "New Ticket" button (layout.tsx, initialData=null)
// and the row Edit action (main.tsx, initialData=ticket). Priority and
// Assignee are optional extras on top of the required four fields:
//   - Priority maps 1:1 to the DB enum (schema.prisma), default MEDIUM.
//   - Assignee lists the ACTIVE org's members (better-auth organization
//     plugin) plus an "Unassigned" option (null = back to the shared
//     queue). The API re-validates membership — this list is UX, not security.

import { useState, useEffect } from "react"
import { z } from "zod"
import { type Ticket, type TicketPriority } from "@/app/_data/tempdata"
import { authClient } from "@/lib/auth-client"

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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

// The full payload this dialog hands to onSave (create -> store.addTicket,
// edit -> store.updateTicket). Extra fields flow straight into the API body.
export type TicketFormValues = {
  subject: string
  customerName: string
  customerEmail: string
  description: string
  priority: TicketPriority
  assigneeId: string | null
}

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
]

// Org members as assignee options (subset of the full-org payload we need).
type MemberOption = { userId: string; name: string; role: string }

// Zod Schema
const TicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  description: z.string().min(1, "Description is required"),
})

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Ticket | null
  onSave: (data: TicketFormValues) => void
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
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM")
  // 👇 "" means Unassigned (sent to the API as null)
  const [assigneeId, setAssigneeId] = useState("")
  const [members, setMembers] = useState<MemberOption[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // >> ASSIGNEE OPTIONS: the ACTIVE org's member list, fetched when the
  //    dialog opens (getFullOrganization without an id resolves the active
  //    org server-side). Scoped per room automatically — switching orgs
  //    repopulates the list on next open.
  useEffect(() => {
    if (!open) return
    let alive = true
    setMembersLoading(true)
    authClient.organization
      .getFullOrganization({ query: { membersLimit: 200 } })
      .then((res) => {
        if (!alive) return
        const list: MemberOption[] = ((res.data as any)?.members ?? [])
          .map((m: any) => ({
            userId: m.userId as string,
            name: (m.user?.name || m.user?.email || "Teammate") as string,
            role: (m.role ?? "AGENT") as string,
          }))
          .sort((a: MemberOption, b: MemberOption) => a.name.localeCompare(b.name))
        setMembers(list)
      })
      .catch(() => {
        // No member list -> the select still works, just empty. The API
        // would reject a foreign id anyway.
        if (alive) setMembers([])
      })
      .finally(() => {
        if (alive) setMembersLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (initialData) {
        setSubject(initialData.subject || "")
        setCustomerName(initialData.customerName || "")
        setCustomerEmail(initialData.customerEmail || "")
        setDescription(initialData.description || "")
        setPriority(initialData.priority ?? "MEDIUM")
        setAssigneeId(initialData.assigneeId ?? "")
      } else {
        setSubject("")
        setCustomerName("")
        setCustomerEmail("")
        setDescription("")
        setPriority("MEDIUM")
        setAssigneeId("")
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
      description,
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

    onSave({
      ...result.data,
      priority,
      // 👇 "" (Unassigned) -> null so the DB stores NULL, not ""
      assigneeId: assigneeId || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-xs font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`min-h-25 resize-none ${errors.description ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.description && (
              <span className="text-xs font-medium text-destructive">{errors.description}</span>
            )}
          </div>

          {/* Priority + Assignee: optional routing fields, side by side on sm+ */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Assignee</Label>
              <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem value="">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name}
                        <span className="ml-1.5 text-[10px] text-muted-foreground">{m.role}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {membersLoading && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading teammates…
                </span>
              )}
            </div>
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
