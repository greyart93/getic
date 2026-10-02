//
// ─── SETTINGS (/settings) ──────────────────────────────────────────────────
// Account & workspace preferences. Deliberately read-mostly: identity comes
// from Better Auth's session hook (auth state is server truth — NOT zustand,
// see components/user-menu.tsx for the same reasoning).
//
// THE TEST-EMAIL BUTTON is the honest way to verify the Resend wiring from
// the UI: it calls POST /api/settings/test-email, which renders a real
// react-email template through lib/email.tsx. The route reports whether the
// mail was actually handed to Resend (sent: true) or only logged to the
// server console (no API key in dev) — and the toast says which happened.

"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth-client"
import LayoutClient from "@/components/layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/toggle-theme"
import { toast } from "@/components/ui/toast"
import { ShieldCheck, Mail, Send, Palette, UserCog } from "lucide-react"
import { formatDateTime } from "@/lib/datetime"

const initialsOf = (name: string, email: string) =>
    (name || email || "?")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()

export default function SettingsPage() {
    // Same reactive session hook the header avatar uses
    const { data, isPending } = useSession()
    const user = data?.user
    const [isSending, setIsSending] = useState(false)

    const sendTestEmail = async () => {
        const toastId = toast.add({
            type: "loading",
            title: "Sending test email",
            description: "Rendering template & calling Resend…",
        })
        setIsSending(true)
        try {
            const res = await fetch("/api/settings/test-email", { method: "POST" })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || "Request failed")
            if (body.sent) {
                toast.update(toastId, {
                    type: "success",
                    title: "Test email sent",
                    description: `Delivered to ${body.recipient} via Resend.`,
                    timeout: 5000,
                })
            } else {
                toast.update(toastId, {
                    type: "warning",
                    title: "Email logged to console",
                    description: "RESEND_API_KEY is missing — check the dev server output.",
                    timeout: 6000,
                })
            }
        } catch (error: any) {
            toast.update(toastId, {
                type: "error",
                title: "Test email failed",
                description: error.message || "Could not send the test email.",
                timeout: 5000,
            })
        } finally {
            setIsSending(false)
        }
    }

    const role = ((user as { role?: string } | undefined)?.role ?? "AGENT") as "ADMIN" | "AGENT"

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mx-auto max-w-2xl">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground">Your account, appearance, and notification controls.</p>
                </div>

                <div className="flex flex-col gap-4">
                    {/* ── Profile (read-only identity from Better Auth) ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCog className="size-4 text-muted-foreground" /> Profile
                            </CardTitle>
                            <CardDescription>Managed by your sign-in method (Better Auth).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isPending || !user ? (
                                <div className="h-16 animate-pulse rounded-lg bg-muted/20" />
                            ) : (
                                <div className="flex items-center gap-4">
                                    <Avatar className="size-14">
                                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                        <AvatarFallback className="text-lg">{initialsOf(user.name, user.email)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{user.name || "Unnamed"}</p>
                                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                                                <ShieldCheck className="mr-1 h-3 w-3" />
                                                {role}
                                            </Badge>
                                            <span>
                                                {user.emailVerified ? "email verified" : "email not verified"}
                                            </span>
                                            {user.createdAt && (
                                                <span>· member since {formatDateTime(user.createdAt as unknown as string)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Appearance ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="size-4 text-muted-foreground" /> Appearance
                            </CardTitle>
                            <CardDescription>
                                Light / dark with a smooth view-transition — the same toggle as the header.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Theme</span>
                            <ThemeToggle />
                        </CardContent>
                    </Card>

                    {/* ── Email notifications (Resend) ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="size-4 text-muted-foreground" /> Email notifications
                            </CardTitle>
                            <CardDescription>
                                Customers automatically get an email when a ticket is created and whenever its status
                                changes — sent through Resend using the react-email templates in{" "}
                                <code className="text-xs">emails/</code>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                                Send yourself a test email to verify the Resend wiring end-to-end.
                            </span>
                            <Button onClick={sendTestEmail} disabled={isSending} className="gap-2 shrink-0">
                                <Send className="size-4" />
                                Send test email
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                </div>
            </main>
        </LayoutClient>
    )
}
