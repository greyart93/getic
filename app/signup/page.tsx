"use client"

//
// ─── SIGNUP PAGE (/signup) — v2 ─────────────────────────────────────────────
// Split-screen auth: patterned brand panel (landing design system) on the
// left, glass form card on the right. On submit a STAGED PROGRESS overlay
// plays through "Securing account → Preparing your room → Almost there"
// while Better Auth works — signup round-trips through the OTP mail hook and
// can feel slow; visible steps keep the user engaged instead of a dead
// spinner. The stages advance on a timer that (roughly) tracks the real
// work, then the page routes to /verify-email as before.
//
// New accounts join as AGENT (admin plugin defaultRole) — becoming ADMIN is
// an explicit admin action, never a self-service option.

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, Ticket, ShieldCheck, BarChart3 } from "lucide-react"
import { ThemeToggle } from "@/components/ui/toggle-theme"
import Link from "next/link"
import Image from "next/image"

// >> Staged loader: labels shown while the signup request is in flight.
const STAGES = [
    "Securing your account",
    "Preparing your workspace",
    "Almost there",
]

function SignupPage() {
    const router = useRouter()
    const search = useSearchParams()
    // >> Default destination after sign-up: the desk. LayoutClient's org
    //    gate forwards org-less users to /welcome (create or join a room).
    const next = search.get("next") || "/tickets"

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [stage, setStage] = useState(0)

    // >> While busy, walk through the stages (~1.4s each). Cleared when the
    //    request resolves; the router.replace below ends the show.
    useEffect(() => {
        if (!busy) return
        setStage(0)
        const t1 = setTimeout(() => setStage(1), 1400)
        const t2 = setTimeout(() => setStage(2), 2800)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [busy])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setBusy(true)
        const { error } = await authClient.signUp.email({ name, email, password })
        setBusy(false)
        if (error) {
            setError(
                error.code === "USER_ALREADY_EXISTS"
                    ? "An account with this email already exists — sign in instead."
                    : (error.message ?? "Sign-up failed. Try again.")
            )
            return
        }
        // >> Account created; the emailOTP plugin just mailed a 6-digit code.
        //    Route to the verification screen — the session exists, but the
        //    requireOrgUser gates still 403 unverified users (lib/rbac.ts).
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`)
    }

    return (
        <main className="min-h-[100svh] flex bg-background text-foreground landing-pattern">
            {/* Theme toggle — top-right corner, available pre-auth */}
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
                        Your team&apos;s <span className="serif-accent">own room</span> for every ticket
                    </h2>
                    <ul className="flex flex-col gap-4 text-sm text-muted-foreground">
                        {[
                            { icon: <Ticket className="h-4 w-4 text-primary" />, text: "Tickets, notes and a shared queue — nothing falls through." },
                            { icon: <ShieldCheck className="h-4 w-4 text-primary" />, text: "Hard multi-tenant rooms: your data never crosses companies." },
                            { icon: <BarChart3 className="h-4 w-4 text-primary" />, text: "Live analytics and presence included, free during beta." },
                        ].map((f) => (
                            <li key={f.text} className="flex items-center gap-3">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card">{f.icon}</span>
                                {f.text}
                            </li>
                        ))}
                    </ul>
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
                    <h1 className="text-xl font-bold tracking-tight">Create your Getic account</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        New accounts join as AGENT — an admin can promote you later.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
                        <div className="grid gap-1.5">
                            <Label htmlFor="name">Full name</Label>
                            <Input id="name" autoComplete="name" required
                                value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Cooper" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" autoComplete="email" required
                                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" autoComplete="new-password" required minLength={8}
                                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" disabled={busy} className="gap-2 mt-1">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create account
                        </Button>
                    </form>

                    <p className="mt-5 text-sm text-muted-foreground text-center">
                        Already have an account?{" "}
                        <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </div>

                {/* ── STAGED PROGRESS OVERLAY (flow B, signup is slow) ── */}
                {busy && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                        <div className="w-full max-w-xs rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl backdrop-blur-xl">
                            <div className="flex flex-col gap-3.5">
                                {STAGES.map((s, i) => {
                                    const done = i < stage
                                    const current = i === stage
                                    return (
                                        <div key={s} className={`flex items-center gap-3 transition-opacity duration-300 ${done || current ? "opacity-100" : "opacity-35"}`}>
                                            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${done ? "border-green-500/60 bg-green-500/10 text-green-600" : current ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                                                {done ? <Check className="h-3.5 w-3.5" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                                            </span>
                                            <span className={`text-sm ${current ? "font-medium" : ""}`}>{s}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                                    style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}

// Static shell prerendered at build time; the form (which reads ?next=)
// client-renders in its place during hydration. Same shape as /login's shell.
export default function SignupPageWrap() {
    return (
        <Suspense fallback={<SignupShellFallback />}>
            <SignupPage />
        </Suspense>
    )
}

function SignupShellFallback() {
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
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        </main>
    )
}
