"use client"

//
// ─── LOGIN PAGE (/login) — v2 ───────────────────────────────────────────────
// Split-screen auth matching /signup: patterned brand panel on the left,
// glass form card on the right. Same flows as before — credentials, OAuth
// (Google/GitHub), ?next= preserved, unverified email routed to /verify-email.
//
// Routing after sign-in: default /tickets (the desk). LayoutClient's org
// gate forwards users with no workspace to /welcome (create or join), and
// pending invitations surface on /notifications and /welcome — flow C/D.
//
// >> SUSPENSE: this page prerenders statically, and useSearchParams() can't
//    run during prerendering. Per the Next.js docs, the component that calls
//    it sits inside a <Suspense> boundary; the shell above is prerendered,
//    the form itself client-renders in place of the fallback.

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, LoaderCircle } from "lucide-react"
import { ThemeToggle } from "@/components/ui/toggle-theme"
import Link from "next/link"
import Image from "next/image"

function LoginPage() {
    const router = useRouter()
    const search = useSearchParams()
    const next = search.get("next") || "/tickets"

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setBusy(true)
        const { error } = await authClient.signIn.email({ email, password })
        setBusy(false)
        if (error) {
            // >> Unverified credentials sign-in -> the OTP verification screen
            //    (Better Auth still rejects, we just route somewhere useful).
            if (error.code === "EMAIL_NOT_VERIFIED") {
                router.replace(`/verify-email?email=${encodeURIComponent(email)}`)
                return
            }
            setError(
                error.code === "INVALID_EMAIL_OR_PASSWORD"
                    ? "Wrong email or password."
                    : (error.message ?? "Sign-in failed. Try again.")
            )
            return
        }
        router.replace(next)
    }

    const handleOAuth = async (provider: "google" | "github") => {
        setError(null)
        setBusy(true)
        await authClient.signIn.social({ provider, callbackURL: next })
    }

    return (
        <main className="min-h-[100svh] flex bg-background text-foreground landing-pattern">
            <div className="fixed top-4 right-4 z-20">
                <ThemeToggle />
            </div>

            {/* ── BRAND PANEL (hidden on mobile) ── */}
            <aside className="relative hidden lg:flex flex-col justify-between w-[46%] max-w-xl p-10 border-r border-border/60 bg-muted/30 overflow-hidden">
                <div aria-hidden className="absolute inset-0 bg-dots" style={{ maskImage: "radial-gradient(70% 70% at 50% 40%, black 30%, transparent 100%)", WebkitMaskImage: "radial-gradient(70% 70% at 50% 40%, black 30%, transparent 100%)" }} />
                <div aria-hidden className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                <div aria-hidden className="absolute bottom-0 -right-24 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />

                <div className="relative">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Image src="/icon.webp" alt="Getic" width={2000} height={562} className="h-7 w-auto logo-invert" priority />
                    </Link>
                </div>

                <div className="relative flex flex-col gap-8">
                    <h2 className="landing-h2 text-3xl xl:text-4xl font-bold">
                        Welcome back to <span className="serif-accent">the desk</span>
                    </h2>
                    <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                        <p className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
                            <span className="font-medium text-foreground">Invited to a room?</span> Sign in with the
                            invited address — the invitation is waiting on your Notifications tab.
                        </p>
                        <p className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
                            <span className="font-medium text-foreground">New here?</span> Create an account and set up
                            your workspace in under a minute.
                        </p>
                    </div>
                </div>

                <p className="relative text-xs text-muted-foreground">
                    Free during beta · no credit card · <span className="landing-bracket">[ GETIC ]</span>
                </p>
            </aside>

            {/* ── FORM SIDE ── */}
            <div className="relative flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur-xl p-6 sm:p-8">
                    <div className="lg:hidden flex justify-center mb-4">
                        <Image src="/icon.webp" alt="Getic" width={2000} height={562} className="h-8 w-auto logo-invert" priority />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Sign in to Getic</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Support desk access — accounts are provisioned by your admin.
                    </p>

                    {/* ── OAUTH ── */}
                    <div className="mt-6 grid gap-2">
                        <Button variant="outline" onClick={() => handleOAuth("google")} disabled={busy} className="gap-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
                            Continue with Google
                        </Button>
                        <Button variant="outline" onClick={() => handleOAuth("github")} disabled={busy} className="gap-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.72-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
                            Continue with GitHub
                        </Button>
                    </div>

                    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
                    </div>

                    {/* ── CREDENTIALS ── */}
                    <form onSubmit={handleCredentials} className="flex flex-col gap-3.5">
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" autoComplete="email" required
                                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" autoComplete="current-password" required
                                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" disabled={busy} className="gap-2">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                            Sign in
                        </Button>
                    </form>

                    <div className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground text-center">
                        <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="underline underline-offset-4">
                            Forgot your password?
                        </Link>
                        <p>
                            No account?{" "}
                            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="underline underline-offset-4">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}

// Static shell prerendered at build time; the form (which reads ?next=)
// client-renders in its place during hydration.
export default function LoginPageWrap() {
    return (
        <Suspense fallback={<LoginShellFallback />}>
            <LoginPage />
        </Suspense>
    )
}

// Prerendered placeholder matching the page's split-screen layout: the brand
// panel shows instantly; the form side holds a soft spinner until hydration.
function LoginShellFallback() {
    return (
        <main className="min-h-[100svh] flex bg-background text-foreground landing-pattern">
            <div className="fixed top-4 right-4 z-20">
                <ThemeToggle />
            </div>
            <aside className="relative hidden lg:flex flex-col justify-between w-[46%] max-w-xl p-10 border-r border-border/60 bg-muted/30 overflow-hidden">
                <div aria-hidden className="absolute inset-0 bg-dots" style={{ maskImage: "radial-gradient(70% 70% at 50% 40%, black 30%, transparent 100%)", WebkitMaskImage: "radial-gradient(70% 70% at 50% 40%, black 30%, transparent 100%)" }} />
                <div aria-hidden className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                <div aria-hidden className="absolute bottom-0 -right-24 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
                <div className="relative">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Image src="/icon.webp" alt="Getic" width={2000} height={562} className="h-7 w-auto logo-invert" priority />
                    </Link>
                </div>
                <p className="relative text-xs text-muted-foreground">
                    Free during beta · no credit card · <span className="landing-bracket">[ GETIC ]</span>
                </p>
            </aside>
            <div className="relative flex-1 flex items-center justify-center p-4">
                <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        </main>
    )
}
