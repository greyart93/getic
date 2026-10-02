"use client"

//
// ─── AUTH GATE (client-side route protection) ──────────────────────────────
// Wraps the app shell (components/layout.tsx). While the session is being
// checked it renders a neutral loader; with no session it bounces to /login
// (preserving the destination so sign-in can come back).
//
// WHY CLIENT-SIDE? The pages themselves are client components fetching via
// zustand; a middleware would also work, but the gate gives a single place
// that (a) shows a loading state instead of flashing protected UI and
// (b) keeps LayoutClient dumb. THE REAL SECURITY is server-side: every API
// route re-checks the session via lib/rbac.ts — bypassing this gate only
// earns you 401s from the API, not data.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

export function AuthGate({ children }: { children: React.ReactNode }) {
    const { data, isPending } = useSession()
    const router = useRouter()
    const signedIn = !!data?.user

    useEffect(() => {
        if (!isPending && !signedIn) {
            // 👇 Send the user back here after signing in
            router.replace(
                `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
            )
        }
    }, [isPending, signedIn, router])

    // Session still loading: neutral spinner (no flash of protected content)
    if (isPending) {
        return (
            <div className="min-h-[60svh] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Signed out: render nothing while the redirect runs
    if (!signedIn) return null

    return <>{children}</>
}
