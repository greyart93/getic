"use client"

//
// --- RESET PASSWORD PAGE (/reset-password?token=...) ------------------------
// The email link hits Better Auth's /reset-password/<token> callback, which
// bounces the browser here with ?token=<token>. authClient.resetPassword()
// then sets the new password (one-hour token window). We do NOT auto sign-in
// after reset - the user re-authenticates with the fresh credentials.

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/ui/toggle-theme"
import Link from "next/link"

export default function ResetPasswordPage() {
    const router = useRouter()
    const search = useSearchParams()
    // >> The email callback forwards the token as ?token=; a missing or expired
    //    token lands here as ?error=INVALID_TOKEN. Both -> the expired screen.
    const token = search.get("token")
    const invalidToken = search.get("error") === "INVALID_TOKEN" || !token

    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (password !== confirm) {
            setError("Passwords do not match.")
            return
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.")
            return
        }
        setBusy(true)
        const { error } = await authClient.resetPassword({
            newPassword: password,
            token: token!,
        })
        setBusy(false)
        if (error) {
            setError(
                error.code === "INVALID_TOKEN"
                    ? "This reset link is invalid or expired. Request a new one."
                    : (error.message ?? "Reset failed. Try again.")
            )
            return
        }
        // >> Password changed - back to sign in with the new credentials.
        router.replace("/login?reset=1")
    }

    if (invalidToken) {
        return (
            <main className="min-h-[100svh] flex items-center justify-center p-4">
                <div className="fixed top-4 right-4"><ThemeToggle /></div>
                <Card className="w-full max-w-sm">
                    <CardHeader className="items-center text-center">
                        <CardTitle className="text-xl">Link expired</CardTitle>
                        <CardDescription>
                            This reset link is invalid or has expired (links last one hour).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <Link href="/forgot-password"
                            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            Request a new link
                        </Link>
                        <p className="text-sm text-muted-foreground text-center">
                            <Link href="/login" className="underline underline-offset-4">Back to sign in</Link>
                        </p>
                    </CardContent>
                </Card>
            </main>
        )
    }

    return (
        <main className="min-h-[100svh] flex items-center justify-center p-4">
            <div className="fixed top-4 right-4"><ThemeToggle /></div>
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <CardTitle className="text-xl">Choose a new password</CardTitle>
                    <CardDescription>At least 8 characters.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">New password</Label>
                            <Input id="password" type="password" autoComplete="new-password" required minLength={8}
                                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="confirm">Confirm new password</Label>
                            <Input id="confirm" type="password" autoComplete="new-password" required minLength={8}
                                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" disabled={busy} className="gap-2">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                            Reset password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
