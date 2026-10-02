"use client"

//
// ─── LANDING PAGE (/) — v3 ─────────────────────────────────────────────────
// Public marketing page. Self-contained (no app shell) and safe for
// signed-in visitors - the CTAs just point into the app.
//
// DESIGN SYSTEM (v2/v3, portfolio-matched):
//   - Type: Manrope everywhere (.landing-root), uppercase section headings
//     with Instrument Serif italic accent words (.landing-h2/.serif-accent),
//     bracket labels [ 01 ] (.landing-bracket).
//   - Sections are FULL DEVICE HEIGHT (min-h-svh, content vertically
//     centered) - no half-visible next section.
//   - Patterns: each section keeps its own texture (grid/dots/rows/diagonal).
//   - Feature cards: animated shining borders (.shine-card conic beam).
//   - Who-it's-for: 3D tilt + cursor spotlight (.tilt-card), no arrow.
//   - How-it-works: auto-advancing demo carousel; the workflow mock shows
//     the REAL pipeline (Open -> In Progress -> Closed + customer email on
//     every status change). The app has no assignees, so none are shown.
//   - Testimonials: two-row infinite marquee, pauses on hover.
//   - Navbar: glassmorphism bar; becomes a floating pill after leaving the
//     top; HIDES while scrolling down once the features section is reached,
//     REAPPEARS on any scroll-up; back to the default bar at the very top.
//   - Mobile: hamburger opens a slide-over menu (right side).
//   - A scroll-to-top arrow appears after the hero.
//   - Theme: sun/moon toggle (next-themes), patterns are theme-aware.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useSession } from "@/lib/auth-client"
import gsap from "gsap"
import {
    Ticket, Building2, Users, ShieldCheck, BarChart3, Mail, Zap,
    Check, ChevronDown, ChevronLeft, ChevronRight, Star, ArrowRight, ArrowUp,
    Globe, Lock, Clock, Sun, Moon, Play, Menu, X, Plus,
} from "lucide-react"

// Gradient accent span (hero highlight, reui-style).
const ACCENT =
    "bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent"

const NAV_LINKS = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#why", label: "Why Getic" },
    { href: "#faq", label: "FAQ" },
]

// ── Pattern layer: one texture per section, softened by a mask ──
const PATTERN_BG = {
    grid: "bg-grid",
    "grid-sm": "bg-grid-sm",
    dots: "bg-dots",
    diagonal: "bg-diagonal",
    rows: "bg-rows",
} as const

const PATTERN_MASK = {
    top: "landing-mask-radial",
    bottom: "landing-mask-radial-b",
    edges: "landing-mask-fade-edges",
} as const

function Pattern({ kind, mask }: { kind: keyof typeof PATTERN_BG; mask?: keyof typeof PATTERN_MASK }) {
    return (
        <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${PATTERN_BG[kind]} ${mask ? PATTERN_MASK[mask] : ""}`}
        />
    )
}

// Full-device-height section: pattern + vertically centered content.
function Section({
    id, className = "", pattern, mask, children,
}: {
    id?: string
    className?: string
    pattern: keyof typeof PATTERN_BG
    mask?: keyof typeof PATTERN_MASK
    children: ReactNode
}) {
    return (
        <section id={id} className={`landing-pattern relative flex min-h-svh ${className}`}>
            <Pattern kind={pattern} mask={mask} />
            <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-center px-4 py-20">{children}</div>
        </section>
    )
}

// ── Mono uppercase eyebrow: "[ 01 ] — Features" ──
function Eyebrow({ n, children, className = "" }: { n?: string; children: ReactNode; className?: string }) {
    return (
        <p className={`landing-eyebrow text-primary mb-3 ${className}`}>
            {n && <span className="text-muted-foreground">[ {n} ]&ensp;&mdash;&ensp;</span>}
            {children}
        </p>
    )
}

// ── Section heading: uppercase Manrope + serif-italic accent ──
function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <h2 className={`landing-h2 reveal text-3xl md:text-4xl font-bold ${className}`}>{children}</h2>
}

// ── Primary + secondary CTA pair ──
function CTARow({ primary, secondary }: { primary: { href: string; label: string }; secondary: { href: string; label: string } }) {
    return (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
                href={primary.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all hover:gap-3"
            >
                {primary.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
                href={secondary.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/60 px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
                {secondary.label}
            </Link>
        </div>
    )
}

// ── Navbar light/dark toggle (placeholder until mounted to avoid SSR flash) ──
function ThemeButton() {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) {
        return <span aria-hidden className="inline-flex h-8 w-8 rounded-lg border border-border/60" />
    }
    const dark = resolvedTheme === "dark"
    return (
        <button
            type="button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    )
}

// ── 3D tilt + cursor spotlight (Who-it's-for cards) ──
function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const onMove = (e: React.MouseEvent) => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        el.style.setProperty("--mx", `${px * 100}%`)
        el.style.setProperty("--my", `${py * 100}%`)
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-3px)`
    }
    const onLeave = () => {
        const el = ref.current
        if (el) el.style.transform = ""
    }
    return (
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`tilt-card group ${className}`}>
            <span aria-hidden className="spotlight" />
            {/* z-[1]: content sits ABOVE the spotlight wash so icons never
                look blanked out on hover */}
            <div className="relative z-[1]">{children}</div>
        </div>
    )
}

// ── Scroll-reveal: adds .is-visible to .reveal elements once on screen ──
function useReveal() {
    useEffect(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add("is-visible")
                        io.unobserve(e.target)
                    }
                })
            },
            { threshold: 0.12 }
        )
        els.forEach((el) => io.observe(el))
        return () => io.disconnect()
    }, [])
}

// ── Visibility gate for the how-it-works mocks ──
// True only while the element is on screen, so each mock animates when it
// is actually watched - and resets/restarts on every re-entry.
function useInView<T extends HTMLElement>(ref: RefObject<T | null>, threshold = 0.3) {
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), { threshold })
        io.observe(el)
        return () => io.disconnect()
    }, [ref, threshold])
    return inView
}

// ── Count-up number (animates when scrolled into view) ──
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null)
    const [val, setVal] = useState(0)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                io.disconnect()
                const start = performance.now()
                const dur = 1200
                const tick = (now: number) => {
                    const p = Math.min(1, (now - start) / dur)
                    const eased = 1 - Math.pow(1 - p, 3)
                    setVal(Math.round(to * eased))
                    if (p < 1) requestAnimationFrame(tick)
                }
                requestAnimationFrame(tick)
            }
        }, { threshold: 0.4 })
        io.observe(el)
        return () => io.disconnect()
    }, [to])
    return (
        <span ref={ref} className="tabular-nums">
            {val.toLocaleString()}
            {suffix}
        </span>
    )
}

// ── Data ──
const FEATURES = [
    {
        icon: <Building2 className="h-5 w-5" />,
        title: "Multi-tenant rooms",
        desc: "Every company gets its own sealed workspace. Tickets, notes and members never cross rooms - the isolation is enforced server-side, not just hidden in the UI.",
        tag: "Isolation",
    },
    {
        icon: <Ticket className="h-5 w-5" />,
        title: "Tickets that flow",
        desc: "Open, In Progress, Closed - with inline notes, a faceted filter bar, bulk actions and customer emails on every status change.",
        tag: "Workflow",
    },
    {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Analytics built in",
        desc: "Eight live charts: growth trends, status mix, backlog age, day-of-week load, resolution rate. Computed instantly from your data.",
        tag: "Insight",
    },
    {
        icon: <Mail className="h-5 w-5" />,
        title: "Email-native",
        desc: "Invites, welcome notes, promotions, ticket updates and password resets all land as polished mail - teammates join from their inbox in one click.",
        tag: "Delivery",
    },
    {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: "Roles that make sense",
        desc: "ADMINs run the room; AGENTs work tickets. Seat caps, last-admin protection and per-organization permissions come standard.",
        tag: "Control",
    },
    {
        icon: <Zap className="h-5 w-5" />,
        title: "Fast by default",
        desc: "Full data on first load, then everything filters, searches and paginates instantly in the browser. No spinner on every click.",
        tag: "Speed",
    },
]

const WHO = [
    { icon: <Building2 className="h-5 w-5" />, title: "Support teams", desc: "One desk for every customer conversation, scoped to your company." },
    { icon: <Users className="h-5 w-5" />, title: "Agencies", desc: "Run each client in its own room - invite staff per workspace." },
    { icon: <Globe className="h-5 w-5" />, title: "SaaS startups", desc: "Spin up a support desk in minutes, scale to a thousand agents." },
]

const ADVANTAGES = [
    { us: "Rooms with hard server-side isolation", them: "Shared tables with client-side filters" },
    { us: "Join by invite link or room ID + password", them: "Admins manually create every account" },
    { us: "Role changes with email notifications", them: "Silent permission edits" },
    { us: "Live team presence built in", them: "No idea who is working" },
    { us: "Eight analytics charts out of the box", them: "Analytics as a paid add-on" },
    { us: "Instant client-side filtering at any size", them: "A spinner on every page load" },
]

const TESTIMONIALS = [
    {
        quote: "We moved three clients into rooms in one afternoon. The isolation is real - I never think about data leaking between accounts.",
        name: "Priya Sharma", role: "Ops lead, agency", initials: "PS",
    },
    {
        quote: "The invite-by-email flow is frictionless. New agents click the link, accept, and are working tickets in under a minute.",
        name: "Daniel Okafor", role: "Support manager, SaaS", initials: "DO",
    },
    {
        quote: "Backlog Age is the chart I did not know I needed. It made our response-time problem impossible to ignore - and fixable.",
        name: "Mara Lindqvist", role: "Head of CX", initials: "ML",
    },
    {
        quote: "Presence alone paid for itself - I can see who is on the desk before I assign anything.",
        name: "Tom Rivera", role: "Team lead", initials: "TR",
    },
]

const FAQ = [
    {
        q: "What is Getic?",
        a: "A multi-tenant support desk: every company works in its own sealed 'room' with tickets, notes, roles, email notifications and live analytics. Think of it as a shared inbox your whole team can actually use.",
    },
    {
        q: "How do people join my organization?",
        a: "Three ways: (1) email invite - they click the link in the mail and are in; (2) room ID + password - you share the ID from the Room access card, they confirm the room and join; (3) an invite link you paste anywhere. Joiners become AGENTs; admins are invited with the ADMIN role.",
    },
    {
        q: "Can other companies see our tickets?",
        a: "No. Every query is filtered by your organization on the server. A crafted request for another room's data gets a 403/404 - there is nothing to filter around.",
    },
    {
        q: "Who can use it?",
        a: "Any team that answers customers: support desks, agencies running multiple clients, SaaS startups. ADMINs manage people and settings; AGENTs work tickets. Seat caps are generous - up to 10 admins and 1,000 agents per room.",
    },
    {
        q: "How is this different from Zendesk or Intercom?",
        a: "Getic is built around hard multi-tenant rooms instead of one shared workspace, joins people in seconds via email/ID, and ships analytics and presence without add-ons or per-seat pricing games.",
    },
    {
        q: "What does it cost?",
        a: "During the beta: free. Create a room, invite the whole team, and see how it fits before a single invoice arrives.",
    },
]

// ── How-it-works: three demo slides (animated mocks, not screenshots) ──
const DEMO_STEPS = [
    { n: "01", title: "Create your room", desc: "Sign up, create an organization, and you are its admin instantly. Your workspace is sealed from everyone else's." },
    { n: "02", title: "Invite your team", desc: "Send email invites with roles - or share your room ID + password and let people join themselves." },
    { n: "03", title: "Work the queue", desc: "Tickets arrive, agents take them, statuses move, customers get notified. Analytics show you the trend lines." },
]

// The REAL ticket pipeline: statuses + customer email on every change.
// (The app has no assignees - agents pick tickets from the shared queue -
// so the mock deliberately shows statuses, not "assigned to".)
// LIVE LOOP, VISIBILITY-GATED: the sequence only runs while the slide is on
// screen, and it RESTARTS from stage 0 every time it re-enters the viewport -
// a visitor who scrolls to it always sees the full story from the beginning,
// never a mid-flight state. The active stage lights up, its connector's dashes
// flow to the next stage, the stage "lands" and the mail line pings
// (customer emailed). Wrapping 2 -> 0 reads as the next ticket entering the
// pipeline.
function MockWorkflow() {
    const stages = [
        { label: "TKT-118", status: "Open", tone: "text-blue-500" },
        { label: "Agent working", status: "In Progress", tone: "text-amber-500" },
        { label: "Resolved", status: "Closed", tone: "text-green-500" },
    ]
    const rootRef = useRef<HTMLDivElement>(null)
    const inView = useInView(rootRef, 0.35)
    const [active, setActive] = useState(0)
    const [flowing, setFlowing] = useState(false)
    const [pingKey, setPingKey] = useState(0)

    useEffect(() => {
        if (!inView) {
            // parked on the opening stage: re-entry restarts the story
            setActive(0)
            setFlowing(false)
            return
        }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setActive(-1)
            return
        }
        let alive = true
        let timer: ReturnType<typeof setTimeout>
        const dwell = () => {
            if (!alive) return
            setFlowing(false)
            timer = setTimeout(flow, 1600)
        }
        const flow = () => {
            if (!alive) return
            setFlowing(true)
            timer = setTimeout(() => {
                if (!alive) return
                setActive((a) => (a + 1) % stages.length)
                setPingKey((k) => k + 1)
                dwell()
            }, 1500)
        }
        timer = setTimeout(flow, 700)
        return () => {
            alive = false
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView])

    return (
        <div ref={rootRef} className="flex h-64 flex-col justify-center gap-5 p-5 sm:h-72 sm:p-6">
            <div className="flex items-center justify-center gap-0">
                {stages.map((s, i) => (
                    <div key={s.status} className="flex items-center">
                        <div className={`mock-window w-28 px-3 py-2.5 sm:w-36 ${active === i ? "mock-stage-active" : ""}`}>
                            <p className="truncate text-[11px] font-semibold">{s.label}</p>
                            <p className={`text-[10px] font-medium ${s.tone}`}>{s.status}</p>
                        </div>
                        {i < stages.length - 1 && (
                            <span aria-hidden className={`mock-conn mx-1 w-8 sm:mx-2 sm:w-14 ${flowing && active === i ? "mock-conn-flow" : ""}`} />
                        )}
                    </div>
                ))}
            </div>
            {/* every status change emails the customer - a real behavior.
                key={pingKey} remounts the line so the ping animation replays
                exactly when a stage "lands". */}
            <p key={pingKey} className="mock-email-ping flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Every status change emails the customer automatically
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
                {["Email", "Roles", "Presence", "Analytics"].map((c) => (
                    <span key={c} className="mock-chip">{c}</span>
                ))}
            </div>
        </div>
    )
}

// LIVE LOOP (same feel as the queue mock), visibility-gated: while the slide
// is watched, the third invite flips from "Invited" to "Joined" with a green
// flash, then the cycle repeats — a new seat joining the room. Leaving the
// slide resets it, so re-entry always shows the join happening live.
function MockInvites() {
    const base = [
        { n: "Priya Sharma", e: "priya@agency.co", r: "AGENT" },
        { n: "Daniel Okafor", e: "daniel@saas.io", r: "AGENT" },
        { n: "Mara Lindqvist", e: "mara@cx.team", r: "ADMIN" },
    ]
    const rootRef = useRef<HTMLDivElement>(null)
    const inView = useInView(rootRef, 0.35)
    const [accepted, setAccepted] = useState(false)

    useEffect(() => {
        if (!inView) {
            setAccepted(false) // pending again - the join replays on re-entry
            return
        }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setAccepted(true)
            return
        }
        let alive = true
        let timer: ReturnType<typeof setTimeout>
        const cycle = () => {
            if (!alive) return
            setAccepted((v) => !v)
            timer = setTimeout(cycle, 2400)
        }
        timer = setTimeout(cycle, 1200)
        return () => {
            alive = false
            clearTimeout(timer)
        }
    }, [inView])

    const rows = base.map((m, i) => ({ ...m, s: i < 2 || accepted ? "Joined" : "Invited" }))
    return (
        <div ref={rootRef} className="h-64 sm:h-72 p-5 sm:p-6">
            <div className="mx-auto max-w-md">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold">Invites</p>
                    <span className="mock-chip"><Plus className="h-3 w-3" /> Invite</span>
                </div>
                <div className="flex flex-col gap-2.5">
                    {rows.map((m, i) => (
                        <div key={m.e} className={`mock-window flex items-center gap-3 px-3.5 py-3 ${i === 2 && accepted ? "mock-row-accept" : ""}`}>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {m.n.split(" ").map((p) => p[0]).join("")}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium">{m.n}</span>
                                <span className="block truncate text-[10px] text-muted-foreground">{m.e}</span>
                            </span>
                            <span className="mock-chip">{m.r}</span>
                            <span className={`text-[10px] font-medium ${m.s === "Joined" ? "text-green-500" : "text-amber-500"}`}>{m.s}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-center text-[10px] text-muted-foreground">Join by room ID + password works too - no email needed.</p>
            </div>
        </div>
    )
}

// The live-queue ticker only scrolls while the slide is on screen
// (.mock-paused freezes it off-screen, so nothing animates unseen).
function MockAnalytics() {
    const rootRef = useRef<HTMLDivElement>(null)
    const inView = useInView(rootRef, 0.25)
    const lines = [
        "TKT-112 · resolved · 4m", "TKT-113 · opened · billing", "TKT-114 · resolved · 2m",
        "TKT-115 · note added", "TKT-116 · opened · bug", "TKT-117 · resolved · 9m",
    ]
    return (
        <div ref={rootRef} className="grid h-64 sm:h-72 grid-cols-2 gap-4 p-5 sm:p-6">
            <div className="mock-window overflow-hidden p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Live queue</p>
                <div className="h-40 overflow-hidden">
                    <div className={`mock-scroll-lines ${inView ? "" : "mock-paused"}`}>
                        {[...lines, ...lines].map((l, i) => (
                            <p key={i} className="py-1.5 text-[11px] text-muted-foreground border-b border-border/40">
                                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-green-500 align-middle" />
                                {l}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mock-window p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resolution rate</p>
                <div className="flex h-32 items-end gap-2">
                    {[42, 58, 51, 70, 64, 86, 94].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary/80" style={{ height: `${h}%` }} />
                    ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground"><span className="font-bold text-foreground">94%</span> this week</p>
            </div>
        </div>
    )
}

const DEMO_MOCKS = [<MockWorkflow key="w" />, <MockInvites key="i" />, <MockAnalytics key="a" />]

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-border/60">
            <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer">
                <span className="font-medium">{q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                    <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
            </div>
        </div>
    )
}

// Navbar visibility state machine (see scroll effect below).
type NavState = "default" | "floated" | "hidden"

export default function LandingPage() {
    useReveal()
    // >> Signed-in visitors do not shop the marketing page: / bounces them
    //    straight into the desk. The CTAs below also swap to "Open your desk".
    const router = useRouter()
    const { data: session, isPending: sessionLoading } = useSession()
    useEffect(() => {
        if (!sessionLoading && session?.user) router.replace("/tickets")
    }, [sessionLoading, session, router])
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    // ── Navbar state machine ────────────────────────────────────────────
    //   y < 32 ................. default bar
    //   scrolling down past the
    //   features section ........ hidden (slides out of view)
    //   otherwise ............... floating glass pill
    //   any scroll-up ........... floating pill comes back
    const [navState, setNavState] = useState<NavState>("default")
    const [showTop, setShowTop] = useState(false)
    const lastY = useRef(0)

    useEffect(() => {
        let raf = 0
        const update = () => {
            raf = 0
            const y = window.scrollY
            const goingDown = y > lastY.current + 2
            const goingUp = y < lastY.current - 2
            if (goingDown || goingUp) lastY.current = y

            setShowTop(y > 600)

            setNavState((prev) => {
                if (y < 32) return "default" // top of page: the default bar
                const features = document.getElementById("features")
                const reachedFeatures = !!features && features.getBoundingClientRect().top <= 64
                if (goingDown && reachedFeatures) return "hidden" // scroll down from features: out of view
                if (goingUp) return "floated" // scroll up anywhere: pill returns
                if (prev === "hidden") return "hidden" // keep hiding while scrolling down
                return "floated"
            })
        }
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update)
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        update()
        return () => {
            window.removeEventListener("scroll", onScroll)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [])

    // ── Parallax footer ──
    const [parallax, setParallax] = useState(0)
    useEffect(() => {
        const onScroll = () => {
            const footer = document.getElementById("landing-footer")
            if (!footer) return
            const rect = footer.getBoundingClientRect()
            const progress = Math.min(1, Math.max(0, 1 - rect.top / window.innerHeight))
            setParallax(progress)
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        onScroll()
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    // ── Mobile menu ──
    const [menuOpen, setMenuOpen] = useState(false)
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : ""
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false)
        window.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = ""
            window.removeEventListener("keydown", onKey)
        }
    }, [menuOpen])

    // ── Demo carousel (GSAP slide animation, auto-advancing) ──
    const viewportRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const idx = useRef(0)
    const hover = useRef(false)
    const [slide, setSlide] = useState(0)

    const go = useCallback((n: number) => {
        const vp = viewportRef.current
        if (!vp) return
        const next = ((n % DEMO_STEPS.length) + DEMO_STEPS.length) % DEMO_STEPS.length
        idx.current = next
        setSlide(next)
        const x = -next * vp.clientWidth
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (reduce) gsap.set(innerRef.current, { x })
        else gsap.to(innerRef.current, { x, duration: 0.85, ease: "power3.inOut", overwrite: true })
    }, [])

    useEffect(() => {
        const t = setInterval(() => {
            if (!hover.current) go(idx.current + 1)
        }, 7000)
        const onResize = () => {
            const vp = viewportRef.current
            if (vp) gsap.set(innerRef.current, { x: -idx.current * vp.clientWidth })
        }
        window.addEventListener("resize", onResize)
        return () => {
            clearInterval(t)
            window.removeEventListener("resize", onResize)
        }
    }, [go])

    // Glass surfaces: high transparency + blur + saturation. In dark mode
    // borders brighten (white/15) so the pill/panel edges stay visible.
    const GLASS = "border-white/40 bg-white/55 dark:border-white/15 dark:bg-black/45 backdrop-blur-xl backdrop-saturate-150"

    return (
        <div className="landing-root min-h-screen bg-background text-foreground overflow-x-clip">
            {/* ── NAV: glass bar -> floating pill; hides on scroll down past
                   features, returns on scroll up ── */}
            <header
                className={`fixed inset-x-0 top-0 z-40 transition-[transform,opacity] duration-500 ${
                    navState === "hidden" ? "-translate-y-[130%] opacity-0" : "translate-y-0 opacity-100"
                }`}
            >
                <div
                    className={`landing-nav mx-auto flex h-14 items-center justify-between gap-3 border px-4 ${
                        navState === "default"
                            ? `max-w-6xl rounded-b-2xl border-b-border/50 ${GLASS}`
                            : `is-floated mt-3 max-w-3xl rounded-full ${GLASS}`
                    }`}
                >
                    <Link href="/" className="flex items-center shrink-0">
                        <Image src="/icon.webp" alt="Getic" width={2000} height={562} className="h-7 w-auto logo-invert" priority />
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                        {NAV_LINKS.map((l) => (
                            <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <ThemeButton />
                        <Link href="/login" className="hidden sm:inline-block text-sm px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Sign in</Link>
                        <Link href="/signup" className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                            Get started
                        </Link>
                        {/* mobile hamburger */}
                        <button
                            type="button"
                            aria-label={menuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((v) => !v)}
                            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── MOBILE MENU: slide-over from the right ── */}
            <div
                aria-hidden={!menuOpen}
                className={`fixed inset-0 z-50 md:hidden ${menuOpen ? "" : "pointer-events-none"}`}
            >
                <div
                    onClick={() => setMenuOpen(false)}
                    className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`}
                />
                <aside
                    className={`absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-1 border-l border-border/60 bg-background p-4 pt-5 shadow-2xl transition-transform duration-300 ${
                        menuOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    <div className="mb-3 flex items-center justify-between">
                        <Image src="/icon.webp" alt="Getic" width={2000} height={562} className="h-6 w-auto logo-invert" />
                        <button
                            type="button"
                            aria-label="Close menu"
                            onClick={() => setMenuOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {NAV_LINKS.map((l) => (
                        <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            {l.label}
                        </a>
                    ))}
                    <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4">
                        <Link href="/login" onClick={() => setMenuOpen(false)}
                            className="rounded-lg border border-border px-3 py-2.5 text-center text-sm font-medium hover:bg-muted transition-colors">
                            Sign in
                        </Link>
                        <Link href="/signup" onClick={() => setMenuOpen(false)}
                            className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
                            Get started
                        </Link>
                    </div>
                </aside>
            </div>

            {/* ── SCROLL TO TOP ── */}
            <button
                type="button"
                aria-label="Back to top"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={`fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/70 backdrop-blur-md shadow-lg transition-all duration-300 hover:bg-muted cursor-pointer ${
                    showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
                }`}
            >
                <ArrowUp className="h-4 w-4" />
            </button>

            {/* ── HERO ── grid texture strongest at the top, dissolving down ── */}
            <section className="landing-pattern relative flex min-h-svh flex-col overflow-hidden">
                <Pattern kind="grid" mask="top" />
                <div aria-hidden className="pointer-events-none absolute inset-0 landing-hero-fade" />
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-[landing-drift_14s_ease-in-out_infinite]" />
                    <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/8 blur-3xl animate-[landing-drift_18s_ease-in-out_infinite_reverse]" />
                    <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/6 blur-3xl animate-[landing-drift_22s_ease-in-out_infinite]" />
                </div>
                <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-center px-4 pt-28 pb-16 text-center">
                    <div className="reveal inline-flex items-center gap-2 self-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground mb-6">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Free during beta · no credit card
                    </div>
                    <h1 className="reveal text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] text-balance">
                        The support desk that keeps{" "}
                        <span className="serif-accent">every company</span> in its{" "}
                        <span className={ACCENT}>own room</span>
                    </h1>
                    <p className="reveal mx-auto mt-5 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
                        Getic gives your team tickets, notes, roles, email notifications and live analytics -
                        sealed inside a multi-tenant workspace your customers never see across.
                    </p>
                    <div className="reveal">
                        {session?.user ? (
                            <CTARow primary={{ href: "/tickets", label: "Open your desk" }} secondary={{ href: "/notifications", label: "Notifications" }} />
                        ) : (
                            <CTARow primary={{ href: "/signup", label: "Create your workspace" }} secondary={{ href: "/login", label: "Sign in" }} />
                        )}
                    </div>
                    <div className="reveal mt-14 max-w-lg mx-auto">
                        <p className="landing-eyebrow text-muted-foreground mb-4">Live from the beta</p>
                        <div className="grid grid-cols-3 divide-x divide-border/60">
                            {[
                                { v: 125, s: "+", label: "tickets handled" },
                                { v: 7, s: "", label: "rooms running" },
                                { v: 60, s: "s", label: "to first invite" },
                            ].map((c) => (
                                <div key={c.label} className="px-4 first:pl-0 last:pr-0">
                                    <p className="text-2xl md:text-3xl font-bold">
                                        <CountUp to={c.v} suffix={c.s} />
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── shining-border cards on a dot matrix ── */}
            <Section id="features" pattern="dots" mask="edges">
                <div className="reveal text-center mb-12">
                    <Eyebrow n="01">Features</Eyebrow>
                    <H2>Everything a desk <span className="serif-accent">needs</span></H2>
                    <p className="mt-3 text-muted-foreground">No add-ons, no tier games - the whole toolkit ships free.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((f, i) => (
                        <div key={f.title}
                            className="shine-card reveal group rounded-2xl border border-border/60 bg-card p-6 transition-[transform,box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                            style={{ transitionDelay: `${i * 40}ms` }}>
                            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                                {f.icon}
                            </div>
                            <h3 className="font-semibold">{f.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                                <span className="landing-bracket">[ 0{i + 1} ]</span>
                                <span className="text-xs font-semibold text-primary/90">{f.tag}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── WHO IT'S FOR ── tilt + spotlight cards on horizontal rules ── */}
            <Section className="bg-muted/20" pattern="rows" mask="edges">
                <div className="reveal text-center mb-12">
                    <Eyebrow n="02">Who it&apos;s for</Eyebrow>
                    <H2>Built for teams that <span className="serif-accent">answer people</span></H2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {WHO.map((w) => (
                        <TiltCard key={w.title} className="reveal rounded-2xl border border-border/60 bg-card p-6">
                            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                                {w.icon}
                            </div>
                            <h3 className="font-semibold">{w.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{w.desc}</p>
                        </TiltCard>
                    ))}
                </div>
            </Section>

            {/* ── HOW IT WORKS ── auto-advancing demo carousel (GSAP slides) ── */}
            <Section id="how" pattern="diagonal" mask="edges">
                <div className="reveal text-center mb-10">
                    <Eyebrow n="03">How it works</Eyebrow>
                    <H2>Up and running in <span className="serif-accent">minutes</span></H2>
                    <p className="mt-3 text-muted-foreground">Watch the flow - each step is a live mock of the desk at work.</p>
                </div>

                <div className="reveal">
                    <div
                        ref={viewportRef}
                        className="carousel-viewport border border-border/60 bg-card shadow-sm"
                        onMouseEnter={() => { hover.current = true }}
                        onMouseLeave={() => { hover.current = false }}
                    >
                        <div ref={innerRef} className="carousel-inner">
                            {DEMO_MOCKS.map((mock, i) => (
                                <div key={i} className="carousel-slide">
                                    <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                                        <span className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Play className="h-3 w-3" /> Step {DEMO_STEPS[i].n} · {DEMO_STEPS[i].title}
                                        </span>
                                    </div>
                                    {mock}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* progress + arrows */}
                    <div className="mt-4 flex items-center gap-4">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/60">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-700"
                                style={{ width: `${((slide + 1) / DEMO_STEPS.length) * 100}%` }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" aria-label="Previous step" onClick={() => go(slide - 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label="Next step" onClick={() => go(slide + 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* step list */}
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        {DEMO_STEPS.map((s, i) => (
                            <button key={s.n} type="button" onClick={() => go(i)}
                                className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                                    slide === i ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card hover:border-primary/30"
                                }`}>
                                <span className="landing-bracket">[ {s.n} ]</span>
                                <p className="mt-1.5 text-sm font-semibold">{s.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ── ADVANTAGES ── small tight grid ── */}
            <Section id="why" className="bg-muted/20" pattern="grid-sm" mask="edges">
                <div className="reveal text-center mb-12">
                    <Eyebrow n="04">Why Getic</Eyebrow>
                    <H2>Why teams pick <span className="serif-accent">Getic</span></H2>
                    <p className="mt-3 text-muted-foreground">A fair fight against the usual tools.</p>
                </div>
                <div className="reveal overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="grid grid-cols-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/60">
                        <div className="px-5 py-3">Getic</div>
                        <div className="px-5 py-3">The other guys</div>
                    </div>
                    {ADVANTAGES.map((a) => (
                        <div key={a.us} className="grid grid-cols-2 border-b border-border/40 last:border-0">
                            <div className="px-5 py-3.5 text-sm flex items-start gap-2">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                                <span>{a.us}</span>
                            </div>
                            <div className="px-5 py-3.5 text-sm text-muted-foreground flex items-start gap-2">
                                <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                <span>{a.them}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── TESTIMONIALS ── two-row infinite marquee ── */}
            <Section pattern="dots" mask="edges">
                <div className="reveal text-center mb-12">
                    <Eyebrow n="05">Testimonials</Eyebrow>
                    <H2>Teams <span className="serif-accent">like it here</span></H2>
                </div>
                <div className="reveal -mx-4 flex flex-col gap-4 overflow-hidden pb-4 marquee-mask">
                    {[false, true].map((reverse, row) => (
                        <div key={row} className={`marquee-track ${reverse ? "reverse" : ""}`} style={{ "--marquee-dur": reverse ? "58s" : "46s" } as CSSProperties}>
                            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                                <figure key={`${row}-${i}`} className="w-[320px] shrink-0 rounded-2xl border border-border/60 bg-card p-6">
                                    <div className="flex gap-0.5 text-amber-400 mb-3">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <Star key={j} className="h-3.5 w-3.5 fill-current" />
                                        ))}
                                    </div>
                                    <blockquote className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                                    <figcaption className="mt-4 flex items-center gap-3">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            {t.initials}
                                        </span>
                                        <span>
                                            <span className="block text-sm font-medium">{t.name}</span>
                                            <span className="block text-xs text-muted-foreground">{t.role}</span>
                                        </span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── FAQ ── full-size grid, echoing the hero ── */}
            <Section id="faq" className="bg-muted/20" pattern="grid" mask="edges">
                <div className="reveal mx-auto w-full max-w-3xl text-center mb-10">
                    <Eyebrow n="06">FAQ</Eyebrow>
                    <H2>Questions, <span className="serif-accent">answered</span></H2>
                </div>
                <div className="reveal mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card px-5">
                    {FAQ.map((f, i) => (
                        <FaqItem key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
                    ))}
                </div>
            </Section>

            {/* ── PARALLAX FOOTER ── grid returns, strongest at the page end ── */}
            <footer id="landing-footer" className="landing-pattern relative overflow-hidden">
                <Pattern kind="grid" mask="bottom" />
                <div aria-hidden className="absolute inset-0 -z-10">
                    <div className="fixed inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
                        style={{ transform: `translateY(${(1 - parallax) * 30}%)`, willChange: "transform" }} />
                </div>
                <div className="relative mx-auto max-w-6xl px-4 pt-24 pb-10 text-center">
                    <div className="reveal">
                        <Eyebrow>Ready when you are</Eyebrow>
                    </div>
                    <h2 className="reveal landing-h2 text-3xl md:text-5xl font-bold text-balance">
                        Your customers are <span className="serif-accent">waiting</span>.
                    </h2>
                    <p className="reveal mx-auto mt-4 max-w-xl text-muted-foreground">
                        Create a room, invite your team, and answer the first ticket today.
                    </p>
                    <div className="reveal mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href="/signup"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all hover:gap-3">
                            Get started free <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/login"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/60 px-8 py-3 text-sm font-medium hover:bg-muted transition-colors">
                            Sign in
                        </Link>
                    </div>

                    <div className="reveal mt-16 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border/40 pt-8 text-sm text-muted-foreground">
                        <Image src="/icon.webp" alt="Getic" width={2000} height={562} className="h-6 w-auto logo-invert" />
                        <nav className="flex items-center gap-5">
                            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
                            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
                            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
                        </nav>
                        <span className="flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5" /> Multi-tenant by design
                            <span className="mx-1 text-border">·</span>
                            <Clock className="h-3.5 w-3.5" /> © {new Date().getFullYear()} Getic
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
