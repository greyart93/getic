"use client"

//
// --- FORGOT PASSWORD PAGE (/forgot-password) --------------------------------
// One email field, then authClient.requestPasswordReset({ email, redirectTo }).
// Better Auth mints a one-hour token and lib/auth.ts's sendResetPassword hook
// mails the link via Nodemailer (lib/email.tsx). Without SMTP_HOST the sender
// logs to the server console (dev) - the flow still completes.
//
// The result is ALWAYS the same "check your inbox" screen whether or not the
// account exists - the endpoint must never confirm which emails are registered
// (anti user-enumeration; Better Auth enforces this server-side as well).

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MailCheck } from "lucide-react"
import { ThemeToggle } from "@/components/ui/toggle-theme"
import Link from "next/link"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [sent, setSent] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setBusy(true)
        // >> redirectTo is where the user lands AFTER clicking the email link;
        //    Better Auth appends ?token=<token> to it.
        const { error } = await authClient.requestPasswordReset({
            email,
            redirectTo: "/reset-password",
        })
        setBusy(false)
        if (error) {
            setError(error.message ?? "Something went wrong. Try again.")
            return
        }
        // >> Same screen for existing AND unknown emails (no enumeration).
        setSent(true)
    }

    return (
        <main className="min-h-[100svh] flex items-center justify-center p-4">
            {/* Theme toggle - top-right corner, available pre-auth */}
            <div className="fixed top-4 right-4">
                <ThemeToggle />
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <CardTitle className="text-xl">Forgot your password?</CardTitle>
                    <CardDescription>
                        {sent
                            ? "Check your inbox - the reset link is valid for one hour."
                            : "Enter your email and we will send you a reset link."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-2">
                            <MailCheck className="h-8 w-8 text-emerald-600" />
                            <p className="text-sm text-muted-foreground text-center">
                                If an account exists for <span className="font-medium">{email}</span>, a reset link is
                                on its way. Did not get it? Check spam, or try again in a minute.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" autoComplete="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <Button type="submit" disabled={busy} className="gap-2">
                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                Send reset link
                            </Button>
                        </form>
                    )}

                    <p className="text-sm text-muted-foreground text-center">
                        <Link href="/login" className="underline underline-offset-4">
                            Back to sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}
