"use client"

//
// --- VERIFY EMAIL PAGE (/verify-email?email=...) ----------------------------
// Signup (and login's EMAIL_NOT_VERIFIED hint) routes here with the address in
// the query. authClient.emailOtp.sendVerificationOtp mails a 6-digit code via
// lib/auth.ts's sendVerificationOTP hook (Nodemailer; server-console log in
// dev without SMTP_HOST), and emailOtp.verifyEmail flips User.emailVerified.
// Error messages stay generic - never confirm whether an email is registered.

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MailCheck } from "lucide-react"
import { ThemeToggle } from "@/components/ui/toggle-theme"
import Link from "next/link"

function VerifyEmailPage() {
    const router = useRouter()
    const search = useSearchParams()
    const email = search.get("email") ?? ""

    const [otp, setOtp] = useState("")
    const [busy, setBusy] = useState(false)
    const [resending, setResending] = useState(false)
    const [resent, setResent] = useState(false)
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setBusy(true)
        // >> Flips User.emailVerified on success; sign-in works afterwards.
        const { error } = await authClient.emailOtp.verifyEmail({
            email,
            otp: otp.trim(),
        })
        setBusy(false)
        if (error) {
            setError(
                error.code === "INVALID_OTP"
                    ? "That code is wrong or expired. Request a new one."
                    : (error.message ?? "Verification failed. Try again.")
            )
            return
        }
        setVerified(true)
        // >> Verified - into the app (signup already left a live session).
        //    /tickets is the front door: the LayoutClient org gate forwards
        //    users with no workspace to /welcome (create / join / invite).
        setTimeout(() => router.replace("/tickets"), 1200)
    }

    const handleResend = async () => {
        setError(null)
        setResending(true)
        const { error } = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        })
        setResending(false)
        if (error) {
            setError(error.message ?? "Could not resend the code. Try again.")
            return
        }
        setResent(true)
    }

    if (!email) {
        // >> No ?email= in the URL - nothing to verify; back to sign in.
        router.replace("/login")
        return null
    }

    return (
        <main className="min-h-[100svh] flex items-center justify-center p-4">
            <div className="fixed top-4 right-4"><ThemeToggle /></div>
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <CardTitle className="text-xl">Verify your email</CardTitle>
                    <CardDescription>
                        {verified
                            ? "Email verified - taking you in..."
                            : <span>We sent a 6-digit code to <b>{email}</b>.</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {verified ? (
                        <div className="flex flex-col items-center gap-3 py-2">
                            <MailCheck className="h-8 w-8 text-emerald-600" />
                            <p className="text-sm text-muted-foreground">All set - redirecting...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <form onSubmit={handleVerify} className="flex flex-col gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="otp">6-digit code</Label>
                                    <Input id="otp" inputMode="numeric" maxLength={6} required
                                        className="text-center text-2xl tracking-[0.5em]" autoFocus
                                        value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                                        placeholder="000000" />
                                </div>
                                {error && <p className="text-sm text-red-600">{error}</p>}
                                <Button type="submit" disabled={busy || otp.length !== 6} className="gap-2">
                                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Verify email
                                </Button>
                            </form>

                            <p className="text-sm text-muted-foreground text-center">
                                {resent ? "A new code is on its way." : (
                                    <button type="button" onClick={handleResend} disabled={resending}
                                        className="underline underline-offset-4 disabled:opacity-50">
                                        {resending ? "Sending..." : "Resend code"}
                                    </button>
                                )}
                            </p>

                            <p className="text-sm text-muted-foreground text-center">
                                <Link href="/login" className="underline underline-offset-4">Back to sign in</Link>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}

// Static shell prerendered at build time; the form (which reads ?email=)
// client-renders in its place during hydration.
export default function VerifyEmailPageWrap() {
    return (
        <Suspense fallback={
            <main className="min-h-[100svh] flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </main>
        }>
            <VerifyEmailPage />
        </Suspense>
    )
}
