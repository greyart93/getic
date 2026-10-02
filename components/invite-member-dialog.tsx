"use client"

//
// ─── INVITE MEMBER DIALOG ──────────────────────────────────────────────────
// The org page's "Invite a member" card, lifted into a reusable dialog so
// the Team page can offer the same flow behind an "Add member" button
// (mirrors the New Ticket button/dialog pattern in components/layout.tsx).
// Same plugin call (authClient.organization.inviteMember), same caps
// (10 ADMINs / 1,000 AGENTs per org, enforced server-side), same email.
//
// The caller owns the refresh: after a successful invite it should reload
// whatever member list it renders (pending invitations are NOT members yet,
// so they do not appear in the roster until accepted).

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field } from "@/components/ui/field"
import { toast } from "@/components/ui/toast"
import { Loader2, UserPlus } from "lucide-react"

interface InviteMemberDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Active organization id (invite is scoped to this room). */
    organizationId?: string | null
    /** Called after an invitation was sent successfully. */
    onInvited?: (email: string) => void
}

export function InviteMemberDialog({ open, onOpenChange, organizationId, onInvited }: InviteMemberDialogProps) {
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"ADMIN" | "AGENT">("AGENT")
    const [inviting, setInviting] = useState(false)

    // Fresh form every time the dialog opens (same reset pattern as TicketFormDialog).
    useEffect(() => {
        if (open) {
            setEmail("")
            setRole("AGENT")
            setInviting(false)
        }
    }, [open])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviting(true)
        const toastId = toast.add({
            type: "loading",
            title: "Sending invitation",
            description: `Inviting ${email} as ${role}...`,
        })
        const { error } = await authClient.organization.inviteMember({
            email: email.trim(),
            role,
            organizationId: organizationId ?? undefined,
        })
        setInviting(false)
        if (error) {
            toast.update(toastId, {
                type: "error",
                title: "Invite failed",
                description: error.message ?? "Could not send the invitation.",
                timeout: 6000,
            })
            return
        }
        toast.update(toastId, {
            type: "success",
            title: "Invitation sent",
            description: `${email} will receive an email with a join link.`,
            timeout: 5000,
        })
        onOpenChange(false)
        onInvited?.(email.trim())
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Invite a member</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs">
                        Up to 10 ADMINs and 1,000 AGENTs per organization. They get an email with a join link.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="flex flex-col gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="invite-member-email">Email</Label>
                        <Input
                            id="invite-member-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="teammate@company.com"
                            autoFocus
                        />
                    </div>
                    {/* reui c-select-1 pattern: Field-wrapped Select with the
                        popup opening BELOW the trigger (never covers the value). */}
                    <Field className="max-w-xs">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "AGENT")}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                                <SelectGroup>
                                    <SelectItem value="AGENT">AGENT (works tickets)</SelectItem>
                                    <SelectItem value="ADMIN">ADMIN (manages the room)</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={inviting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={inviting || !organizationId} className="gap-2">
                            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            Send invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
