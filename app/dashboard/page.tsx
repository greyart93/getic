//
// ─── ANALYTICS DASHBOARD (/dashboard) ─────────────────────────────────
// Read-only page: four summary cards + EIGHT charts, all computed ENTIRELY
// client-side from `tickets` in the zustand store (the store holds the WHOLE
// table — one full-array fetch; see lib/store.ts). No separate analytics API.
//
// CHARTING: built on shadcn's chart primitives (components/ui/chart.tsx,
// which wraps Recharts). Every chart is wrapped in <ChartContainer>, which
// provides: a ResponsiveContainer (charts stretch to their grid cell),
// CSS-variable theming from the config (auto light/dark via --color-*),
// and the styled <ChartTooltip>/<ChartLegend>. Each chart declares its own
// `chartConfig` — the single source of truth for series labels + colors.
//
// LAYOUT (the charts grid, top to bottom):
//   Row 1: Status donut · Customer bars · Resolution gauge   (3 singles)
//   Row 2: Ticket Growth area                                (full width)
//   Row 3: Day-of-Week radar · Monthly Volume · Backlog Age  (3 singles)
//   Row 4: Workload Composition (stacked area + legend)      (full width)
//
// RESPONSIVENESS:
//   - Grid: 1 column on mobile → 2 cols on tablet → 3 cols on desktop;
//     the two wide charts span full width at every breakpoint.
//   - Heights live on ChartContainer via Tailwind (h-[220px] → h-[260px]
//     → h-[300px]) so Recharts always has a measured box to fill.
//   - All radii are percentages, so charts scale with their container.

"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { useTicketStore } from "@/lib/store"
import LayoutClient from "@/components/layout"

// Recharts primitives (layout math only — theming/tooltip come from shadcn)
import {
    PieChart, Pie, Cell,
    BarChart, Bar,
    AreaChart, Area,
    RadarChart, PolarGrid, PolarAngleAxis, Radar as RadarSeries,
    RadialBarChart, RadialBar,
    XAxis, YAxis, CartesianGrid, PolarRadiusAxis, LabelList,
} from "recharts"

// shadcn chart + card primitives
import {
    ChartContainer, ChartTooltip, ChartTooltipContent,
    ChartLegend, ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// ── The 4 stat mini-cards (top row) ──
// NOTE: shadcn's <Card> has NO horizontal padding of its own — the side
// margins come from CardHeader/CardContent (px-(--card-spacing)). Rendering
// raw children directly inside <Card> makes the text touch the card edge,
// which looked "cut off". Always go through CardHeader/CardContent.
function StatCard({
    title, num, accent, badge, footnote,
}: {
    title: string
    num: number
    accent?: string
    // Optional top-right badge (trend arrow / share) — shadcn-style.
    // label is a ReactNode so it can be responsive (short on mobile).
    badge?: { icon: React.ReactNode; label: React.ReactNode; className?: string }
    footnote?: string
}) {
    return (
        <Card className="gap-1 py-4">
            <CardHeader>
                <CardDescription className="text-xs md:text-sm font-medium">{title}</CardDescription>
                {/* 👇 `accent` is now a text color CLASS, not a hex — stat cards
                    inherit the neutral theme instead of hardcoded hues. */}
                <CardTitle className={`text-2xl md:text-3xl font-bold tabular-nums ${accent ?? ""}`}>
                    {num}
                </CardTitle>
                {badge && (
                    <CardAction className="hidden sm:block">
                        <Badge variant="outline" className={badge.className ?? ""}>
                            {badge.icon}
                            {badge.label}
                        </Badge>
                    </CardAction>
                )}
            </CardHeader>
            {footnote && (
                <CardContent>
                    <p className="text-xs text-muted-foreground">{footnote}</p>
                </CardContent>
            )}
        </Card>
    )
}

// ── Shared chart card chrome (title + description + fixed-height body) ──
// Keeping every chart inside the same Card shell is what makes the grid
// responsive and visually consistent: each Card fills its grid cell and the
// ChartContainer inside fills the Card.
function ChartCard({
    title, description, className, action, children,
}: {
    title: string
    description?: string
    className?: string // grid span, e.g. "xl:col-span-3"
    // Optional control rendered top-right in the header (CardAction) —
    // used by the time-range selector on the daily charts.
    action?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                {action && <CardAction>{action}</CardAction>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

// Fixed, responsive heights for every chart body. One place to tune.
const CHART_HEIGHT = "h-[220px] sm:h-[260px] lg:h-[300px]"

// Shared axis tick styling (keeps every chart visually identical).
const AXIS_TICK = { fill: 'currentColor', fontSize: 12, opacity: 0.6 } as const

// ── COLOR POLICY: one palette, like shadcn's own charts ──
// No chart hardcodes a hex. Every series pulls a step from the theme's
// --chart-1..5 ramp (globals.css) — a single blue family, light → dark —
// so charts restyle with the theme automatically: zero per-chart color
// maintenance, and dark mode is free.
//   --chart-1 = lightest step  …  --chart-5 = darkest step
// Statuses claim steps so a status keeps the same tone in every chart:
const STATUS_COLORS = {
    'OPEN': 'var(--chart-1)',
    'IN PROGRESS': 'var(--chart-2)',
    'CLOSED': 'var(--chart-5)',
};
// Bar charts consume the ramp in order (chart-5 for the single-series bars).
const BAR_COLORS = ['var(--chart-5)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-1)'];

// ⬇️ Animations OFF by default, everywhere. Two reasons:
//   1. Recharts draws animated shapes (pie sectors, bars) via
//      requestAnimationFrame — a background/occluded tab never fires rAF, so
//      the shapes would stay EMPTY until the tab is focused. Static render is
//      always correct, instantly, in every tab state.
//   2. Dashboard data changes feel snappier without a re-grow animation on
//      every store update.
// EXCEPTION: the two daily charts (Ticket Growth, Workload Composition) flip
// animation ON for ~1s whenever the time-range changes (see `animateCharts`
// in DashboardPage) — the user is actively looking at that moment, and the
// day-window transition then reads as a deliberate morph instead of a snap.
const NO_ANIM = { isAnimationActive: false } as const;

// ── Chart configs: shadcn's single source of truth for labels + colors ──
// Keys match the series `dataKey`s; `label` is what tooltips/legends show,
// `color` becomes a CSS variable (--color-<key>) that ChartContainer injects.

// Steps mirror STATUS_COLORS (open = lightest, in-progress = middle,
// closed = darkest) so every chart reads as one visual system.
const statusChartConfig = {
    count: { label: "Tickets" },
    OPEN: { label: "Open", color: STATUS_COLORS['OPEN'] },
    IN_PROGRESS: { label: "In Progress", color: STATUS_COLORS['IN PROGRESS'] },
    CLOSED: { label: "Closed", color: STATUS_COLORS['CLOSED'] },
} satisfies ChartConfig

const customerChartConfig = {
    tickets: { label: "Tickets", color: "var(--chart-5)" },
} satisfies ChartConfig

const timelineChartConfig = {
    count: { label: "Created", color: "var(--chart-3)" },
} satisfies ChartConfig

const resolutionChartConfig = {
    resolution: { label: "Resolved %", color: "var(--chart-4)" },
} satisfies ChartConfig

const dowChartConfig = {
    count: { label: "Tickets", color: "var(--chart-3)" },
} satisfies ChartConfig

const monthlyChartConfig = {
    count: { label: "Tickets", color: "var(--chart-4)" },
} satisfies ChartConfig

const backlogChartConfig = {
    count: { label: "Open tickets", color: "var(--chart-2)" },
} satisfies ChartConfig

const compositionChartConfig = {
    open: { label: "Open", color: STATUS_COLORS['OPEN'] },
    inProgress: { label: "In Progress", color: STATUS_COLORS['IN PROGRESS'] },
    closed: { label: "Closed", color: STATUS_COLORS['CLOSED'] },
} satisfies ChartConfig

// Recharts tooltip fallback (used only by the radial gauge, whose value
// lives outside the standard series shape).
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card text-card-foreground p-3 border rounded-lg shadow-md text-sm">
                {label && <p className="font-semibold mb-1">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <p key={index}>
                        {entry.name}: <span className="font-medium">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    // Same store as the table page. The store holds the WHOLE table (one
    // full-array fetch — see lib/store.ts), so charts aggregate everything.
    const { tickets, fetchTickets, isLoading } = useTicketStore()
    // 👇 isClient flips on after mount: Recharts measures the DOM, so rendering
    //    during SSR would produce hydration mismatches. `null` until then.
    const [isClient, setIsClient] = useState(false)
    // 👇 Time-range selector (shadcn dashboard example): how many calendar
    //    days the two daily charts (Ticket Growth, Workload Composition) show.
    const [timeRange, setTimeRange] = useState<7 | 14 | 30>(14)
    // 👇 Chart morph animation: ON for ~1s after a day-range change, off
    //    otherwise (mount stays static — see the NO_ANIM comment). A ref
    //    skips the very first render so opening the dashboard never animates.
    const [animateCharts, setAnimateCharts] = useState(false)
    const firstRange = useRef(true)
    useEffect(() => {
        if (firstRange.current) {
            firstRange.current = false
            return
        }
        setAnimateCharts(true)
        const t = setTimeout(() => setAnimateCharts(false), 1000)
        return () => clearTimeout(t)
    }, [timeRange])

    useEffect(() => {
        setIsClient(true)
        fetchTickets()
    }, [])

    // ── ALL DERIVED DATA ── one useMemo over the full dataset recomputes
    // every card and chart whenever the store changes.
    const {
        statusData, customerData, timelineData, radarData,
        monthlyData, backlogData, compositionData,
        resolution, counts, trend7d,
    } = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'OPEN').length;
        const inProgress = tickets.filter(t => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS').length;
        const closed = tickets.filter(t => t.status === 'CLOSED').length;

        // 1. Status distribution (pie) — grouped + colored by neutral step.
        //    Percentage of total is computed for the always-visible legend
        //    (touch users can't hover a tooltip, so the chart must be
        //    self-describing without it).
        const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
        const statusData = [
            { key: 'OPEN', name: 'Open', count: open, share: pct(open), fill: STATUS_COLORS['OPEN'] },
            { key: 'IN_PROGRESS', name: 'In Progress', count: inProgress, share: pct(inProgress), fill: STATUS_COLORS['IN PROGRESS'] },
            { key: 'CLOSED', name: 'Closed', count: closed, share: pct(closed), fill: STATUS_COLORS['CLOSED'] },
        ].filter(d => d.count > 0);

        // 2. Top customers (bar) — group → sort → top 5
        const customerMap: Record<string, number> = {};
        tickets.forEach(t => {
            const name = t.customerName || "Unknown";
            customerMap[name] = (customerMap[name] || 0) + 1;
        });
        const customerData = Object.entries(customerMap)
            .map(([name, count]) => ({ name, tickets: count }))
            .sort((a, b) => b.tickets - a.tickets)
            .slice(0, 5);

        // ── Daily-window helper (zero-filled) ──
        // Builds a contiguous calendar window of the last `days` LOCAL days
        // (today - days + 1 … today) with every counter at 0, then folds the
        // tickets into it in ONE pass. Unlike bucketing only days-with-data,
        // empty days stay visible as 0 — an honest trend line with no
        // misleading gaps. A ticket at 11 PM UTC +5:30 lands on the next day
        // for IST users because day boundaries are LOCAL midnights.
        const buildDailyWindow = (days: number) => {
            const today = new Date();
            const window: Array<{
                ts: number; date: string; count: number;
                open: number; inProgress: number; closed: number;
            }> = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
                window.push({
                    ts: d.getTime(),
                    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                    count: 0, open: 0, inProgress: 0, closed: 0,
                });
            }
            const firstTs = window[0].ts;
            tickets.forEach(t => {
                if (!t.createdAt) return;
                const d = new Date(t.createdAt);
                if (isNaN(d.getTime())) return;
                const dayTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                const idx = Math.round((dayTs - firstTs) / 86400000); // days since window start
                if (idx < 0 || idx >= window.length) return;
                const slot = window[idx];
                slot.count += 1;
                if (t.status === 'CLOSED') slot.closed += 1;
                else if (t.status === 'OPEN') slot.open += 1;
                else slot.inProgress += 1; // "IN PROGRESS" and "IN_PROGRESS"
            });
            return window;
        };

        // 3. Ticket Growth (area) — count per calendar day for the selected
        //    range (zero-filled; see buildDailyWindow above)
        const timelineData = buildDailyWindow(timeRange).map(({ date, count }) => ({ date, count }));

        // 4. Day-of-week radar — which weekday generates the most tickets.
        // getDay(): 0=Sun…6=Sat; map to readable labels for the radar spokes.
        const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dowCounts = new Array(7).fill(0);
        tickets.forEach(t => {
            if (!t.createdAt) return;
            const d = new Date(t.createdAt);
            if (!isNaN(d.getTime())) dowCounts[d.getDay()] += 1;
        });
        const radarData = DOW_LABELS.map((day, i) => ({ day, count: dowCounts[i] }));

        // 5. Monthly Volume (bar) — tickets per calendar month, last 6
        //    months with data. Complements the daily view with long-range
        //    context (their data spans Aug–Sep 2026 → 2 bars today, grows
        //    automatically as months accumulate).
        const monthMap = new Map<number, { month: string; count: number; ts: number }>();
        tickets.forEach(t => {
            if (!t.createdAt) return;
            const d = new Date(t.createdAt);
            if (isNaN(d.getTime())) return;
            const ts = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
            const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
            const e = monthMap.get(ts);
            if (e) e.count += 1;
            else monthMap.set(ts, { month: label, count: 1, ts });
        });
        const monthlyData = [...monthMap.values()]
            .sort((a, b) => a.ts - b.ts)
            .slice(-6)
            .map(({ month, count }) => ({ month, count }));

        // 6. Backlog Age (bar) — how stale the open work is. Every OPEN /
        //    IN_PROGRESS ticket is aged by days-since-created and dropped
        //    into a bucket. A right-leaning histogram = aging backlog.
        const AGE_BUCKETS = [
            { label: 'Today', min: 0, max: 1 },
            { label: '2-3d', min: 1, max: 3 },
            { label: '4-7d', min: 3, max: 7 },
            { label: '8-14d', min: 7, max: 14 },
            { label: '15d+', min: 14, max: Infinity },
        ];
        const backlogData = AGE_BUCKETS.map(b => ({ age: b.label, count: 0 }));
        tickets.forEach(t => {
            if (t.status !== 'OPEN' && t.status !== 'IN PROGRESS' && t.status !== 'IN_PROGRESS') return;
            if (!t.createdAt) return;
            const d = new Date(t.createdAt);
            if (isNaN(d.getTime())) return;
            const days = Math.floor((Date.now() - d.getTime()) / 86400000);
            const idx = AGE_BUCKETS.findIndex(b => days >= b.min && days < b.max);
            if (idx >= 0) backlogData[idx].count += 1;
        });

        // 7. Workload Composition (stacked area) — status split per calendar
        //    day for the selected range (same zero-filled window, so both
        //    daily charts always agree on their x-axis).
        const compositionData = buildDailyWindow(timeRange).map(({ date, open, inProgress, closed }) => ({ date, open, inProgress, closed }));

        // 8. Resolution gauge — closed share of the whole table (0 when empty).
        const resolution = total > 0 ? Math.round((closed / total) * 100) : 0;

        // 9. Trend for the stat cards (shadcn dashboard pattern) — tickets
        //    created in the last 7 days vs the 7 days before that. Null when
        //    the prior window had none (no honest % exists yet).
        const dayMs = 86400000;
        const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        const createdIn = (fromDaysAgo: number, toDaysAgo: number) => tickets.filter(t => {
            if (!t.createdAt) return false;
            const d = new Date(t.createdAt);
            if (isNaN(d.getTime())) return false;
            const dayTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return dayTs >= startOfToday - fromDaysAgo * dayMs && dayTs < startOfToday - (toDaysAgo - 1) * dayMs;
        }).length;
        const last7 = createdIn(6, 0);
        const prev7 = createdIn(13, 7);
        const trend7d: number | null = prev7 === 0 ? null : Math.round(((last7 - prev7) / prev7) * 100);

        // Raw counts are returned separately (NOT derived from statusData —
        // a status with 0 tickets is filtered out of the pie but the stat
        // card must still show 0).
        const counts = { total, open, inProgress, closed };

        return {
            statusData, customerData, timelineData, radarData,
            monthlyData, backlogData, compositionData,
            resolution, counts, trend7d,
        };
    }, [tickets, timeRange]);

    // Render nothing on the server pass — see isClient above
    if (!isClient) return null;

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Overview of your ticket statistics and team performance.</p>
                </div>

                {isLoading ? (
                    // ── LOADING SKELETON: pulse placeholders for cards + charts ──
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 border rounded-xl flex-1 animate-pulse bg-muted/20">
                                    <div className="h-4 w-16 bg-muted-foreground/20 rounded mb-4"></div>
                                    <div className="h-8 w-12 bg-muted-foreground/20 rounded"></div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="border rounded-xl p-4 h-64 animate-pulse bg-muted/10"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">

                        {/* Summary Cards — shadcn dashboard-example layout:
                            label / big number / top-right badge / footnote.
                            All neutral: the Closed number uses text-primary,
                            everything else inherits the card foreground. */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="Total Tickets"
                                num={counts.total}
                                badge={trend7d === null
                                    ? { icon: <Minus className="h-3 w-3" />, label: "no prior data", className: "text-muted-foreground" }
                                    : trend7d >= 0
                                        ? {
                                            icon: <TrendingUp className="h-3 w-3" />,
                                            // 👇 Short label on mobile — the full text
                                            //    overhangs a 2-col card at 390px
                                            label: (<><span>{trend7d >= 0 ? `+${trend7d}%` : `${trend7d}%`}</span><span className="hidden sm:inline"> this week</span></>),
                                            className: "text-green-600",
                                        }
                                        : {
                                            icon: <TrendingDown className="h-3 w-3" />,
                                            label: (<><span>{trend7d}%</span><span className="hidden sm:inline"> this week</span></>),
                                            className: "text-red-600",
                                        }}
                                footnote="vs the 7 days before"
                            />
                            <StatCard
                                title="Open"
                                num={counts.open}
                                badge={{ icon: <Minus className="h-3 w-3" />, label: `${counts.total ? Math.round((counts.open / counts.total) * 100) : 0}% of all`, className: "text-muted-foreground" }}
                                footnote="Awaiting first action"
                            />
                            <StatCard
                                title="In Progress"
                                num={counts.inProgress}
                                badge={{ icon: <Minus className="h-3 w-3" />, label: `${counts.total ? Math.round((counts.inProgress / counts.total) * 100) : 0}% of all`, className: "text-muted-foreground" }}
                                footnote="Being worked on right now"
                            />
                            <StatCard
                                title="Closed"
                                num={counts.closed}
                                accent="text-primary"
                                badge={{ icon: <TrendingUp className="h-3 w-3" />, label: `${resolution}% resolved`, className: "text-green-600" }}
                                footnote="Lifetime resolution rate"
                            />
                        </div>

                        {/* Charts Grid — 1 col mobile → 2 tablet → 3 desktop.
                            The two wide charts span the full row at every
                            breakpoint (md:col-span-2 xl:col-span-3). */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                            {/* 1. Status Distribution — donut, colors from
                                data.fill. Percentage radii scale with the
                                container, so no fixed-pixel overflow. */}
                            <ChartCard title="Status Distribution" description="All tickets by current status">
                                <ChartContainer config={statusChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        {/* 👇 Labels ON, always: mobile has no hover, so
                                            each sector is directly labeled with its
                                            percentage. Custom <text> renderer (the
                                            classic Recharts pattern) because the
                                            default label inherits the SECTOR's fill —
                                            unreadable on the lightest step — while
                                            currentColor always matches the card text. */}
                                        <Pie
                                            {...NO_ANIM}
                                            data={statusData}
                                            dataKey="count"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="52%"
                                            outerRadius="72%"
                                            paddingAngle={4}
                                            stroke="var(--background)"
                                            strokeWidth={2}
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, outerRadius, percent }: any) => {
                                                const RAD = Math.PI / 180
                                                const r = (outerRadius ?? 0) + 14
                                                const x = (cx ?? 0) + r * Math.sin(-(midAngle ?? 0) * RAD)
                                                const y = (cy ?? 0) + r * Math.cos(-(midAngle ?? 0) * RAD)
                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        fill="currentColor"
                                                        fontSize={12}
                                                        fontWeight={600}
                                                        textAnchor={x > (cx ?? 0) ? "start" : "end"}
                                                        dominantBaseline="central"
                                                    >
                                                        {`${Math.round((percent ?? 0) * 100)}%`}
                                                    </text>
                                                )
                                            }}
                                        >
                                            {statusData.map((entry) => (
                                                <Cell key={entry.key} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                {/* Always-visible legend (name · count · share) —
                                    the full information the tooltip carries, laid
                                    out so touch users never need to hover. The
                                    total sits on the right as the row balance. */}
                                <div className="mt-2 flex flex-col gap-1">
                                    {statusData.map((entry) => (
                                        <div key={entry.key} className="flex items-center gap-2 text-sm">
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                                style={{ background: entry.fill }}
                                                aria-hidden
                                            />
                                            <span className="text-muted-foreground">{entry.name}</span>
                                            <span className="ml-auto font-medium tabular-nums">{entry.count}</span>
                                            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                                                {entry.share}%
                                            </span>
                                        </div>
                                    ))}
                                    <div className="mt-1 flex items-center gap-2 border-t pt-1.5 text-sm">
                                        <span className="text-muted-foreground">Total</span>
                                        <span className="ml-auto font-semibold tabular-nums">{counts.total}</span>
                                        <span className="w-10" />
                                    </div>
                                </div>
                            </ChartCard>

                            {/* 2. Tickets by Customer — horizontal bars. Two
                                anti-clipping measures (this chart used to get
                                cut off at both edges):
                                a) YAxis labels are TRUNCATED at 9 chars so long
                                   customer names never overflow the 78px axis
                                   gutter into the card padding.
                                b) The hidden XAxis domain gets 15% headroom
                                   (dataMax × 1.15) + a 40px right margin, so
                                   the value labels at the end of the LONGEST
                                   bar still fit inside the SVG instead of
                                   being clipped at the right edge. */}
                            <ChartCard title="Tickets by Customer" description="Top 5 customers by ticket volume">
                                <ChartContainer config={customerChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <BarChart data={customerData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis type="number" hide domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={78}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value: string) => (value.length > 9 ? `${value.slice(0, 8)}…` : value)}
                                            tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.7 }}
                                        />
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Bar {...NO_ANIM} dataKey="tickets" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                            {customerData.map((entry, index) => (
                                                <Cell key={entry.name} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                            ))}
                                            <LabelList dataKey="tickets" position="right" fill="currentColor" opacity={0.8} fontSize={12} fontWeight={600} />
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </ChartCard>

                            {/* 3. Resolution Rate — radial half-dial gauge.
                                The dial occupies the TOP half of the container
                                (Recharts keeps the polar origin at cy=50%), so
                                the big % label is absolutely positioned with
                                its bottom edge on the container's 50% line —
                                i.e. exactly inside the dial's hole, at the
                                flat edge, at every breakpoint. */}
                            <ChartCard title="Resolution Rate" description="Share of all tickets closed">
                                <div className="relative">
                                    <ChartContainer config={resolutionChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                        <RadialBarChart
                                            data={[{ name: 'resolution', value: resolution }]}
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius="65%"
                                            outerRadius="100%"
                                        >
                                            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                            <ChartTooltip content={<CustomTooltip />} />
                                            <RadialBar {...NO_ANIM} dataKey="value" cornerRadius={12} fill="var(--color-resolution)" background={{ fill: 'var(--muted)' }} />
                                        </RadialBarChart>
                                    </ChartContainer>
                                    {/* Dial label: bottom of the block sits on
                                        the 50% line = the dial's flat edge */}
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-full flex flex-col items-center pointer-events-none">
                                        <span className="text-xs text-muted-foreground tracking-wide uppercase">resolved</span>
                                        <span className="text-2xl md:text-3xl font-bold leading-tight">{resolution}%</span>
                                    </div>
                                </div>
                            </ChartCard>

                            {/* 4. Ticket Growth — area chart with gradient,
                                with the shadcn-example time-range selector in
                                the header (CardAction). Zero-filled window:
                                days with no tickets show as 0. gradientId is
                                REQUIRED: without a stable id, two gradients
                                on one page collide. */}
                            <ChartCard
                                title="Ticket Growth"
                                description={`Tickets created per day (last ${timeRange} days)`}
                                className="md:col-span-2 xl:col-span-3"
                                action={
                                    <Select value={String(timeRange)} onValueChange={(v) => setTimeRange(Number(v) as 7 | 14 | 30)}>
                                        <SelectTrigger className="h-8 w-[110px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="7">Last 7 days</SelectItem>
                                            <SelectItem value="14">Last 14 days</SelectItem>
                                            <SelectItem value="30">Last 30 days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                }
                            >
                                <ChartContainer config={timelineChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <AreaChart data={timelineData} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="fillGrowth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.5} />
                                                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} minTickGap={24} tick={AXIS_TICK} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={AXIS_TICK} />
                                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                        <Area
                                            isAnimationActive={animateCharts}
                                            animationDuration={700}
                                            type="monotone"
                                            dataKey="count"
                                            stroke="var(--color-count)"
                                            strokeWidth={2.5}
                                            fill="url(#fillGrowth)"
                                            dot={{ r: 3, strokeWidth: 2, fill: "var(--background)" }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </ChartCard>

                            {/* 5. Day-of-Week radar — workload shape across
                                the week. Percentage radii keep it inside
                                small containers. */}
                            <ChartCard title="Day-of-Week Load" description="When tickets come in, across the week">
                                <ChartContainer config={dowChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                                        <PolarGrid stroke="var(--border)" />
                                        <PolarAngleAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.7 }} />
                                        <PolarRadiusAxis tick={false} axisLine={false} />
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <RadarSeries
                                            {...NO_ANIM}
                                            dataKey="count"
                                            stroke="var(--color-count)"
                                            fill="var(--color-count)"
                                            fillOpacity={0.35}
                                            strokeWidth={2}
                                        />
                                    </RadarChart>
                                </ChartContainer>
                            </ChartCard>

                            {/* 6. NEW: Monthly Volume — long-range context the
                                14-day growth chart can't show. Grows one bar
                                per calendar month automatically. */}
                            <ChartCard title="Monthly Volume" description="Tickets created per month">
                                <ChartContainer config={monthlyChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <BarChart data={monthlyData} margin={{ top: 20, right: 8, left: -24, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} tick={AXIS_TICK} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={AXIS_TICK} />
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Bar {...NO_ANIM} dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                            <LabelList dataKey="count" position="top" fill="currentColor" opacity={0.8} fontSize={12} fontWeight={600} />
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </ChartCard>

                            {/* 7. NEW: Backlog Age — how stale the open work
                                is. Every open/in-progress ticket is aged by
                                days-since-created into buckets; a bar piling
                                up on the right = an aging backlog. */}
                            <ChartCard title="Backlog Age" description="Open & in-progress tickets by age">
                                <ChartContainer config={backlogChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <BarChart data={backlogData} margin={{ top: 20, right: 8, left: -24, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis dataKey="age" axisLine={false} tickLine={false} tickMargin={8} tick={AXIS_TICK} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={AXIS_TICK} />
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Bar {...NO_ANIM} dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                            <LabelList dataKey="count" position="top" fill="currentColor" opacity={0.8} fontSize={12} fontWeight={600} />
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </ChartCard>

                            {/* 8. Workload Composition — stacked status split
                                per calendar day (the growth chart's total,
                                decomposed) — shares the same time-range
                                selector state, so both daily charts always
                                agree on their x-axis. */}
                            <ChartCard
                                title="Workload Composition"
                                description={`Status mix of tickets created per day (last ${timeRange} days)`}
                                className="md:col-span-2 xl:col-span-3"
                                action={
                                    <Select value={String(timeRange)} onValueChange={(v) => setTimeRange(Number(v) as 7 | 14 | 30)}>
                                        <SelectTrigger className="h-8 w-[110px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="7">Last 7 days</SelectItem>
                                            <SelectItem value="14">Last 14 days</SelectItem>
                                            <SelectItem value="30">Last 30 days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                }
                            >
                                <ChartContainer config={compositionChartConfig} className={`${CHART_HEIGHT} w-full aspect-auto`}>
                                    <AreaChart data={compositionData} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} minTickGap={24} tick={AXIS_TICK} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={AXIS_TICK} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Area isAnimationActive={animateCharts} animationDuration={700} type="monotone" dataKey="open" stackId="mix" stroke="var(--color-open)" fill="var(--color-open)" fillOpacity={0.45} strokeWidth={2} />
                                        <Area isAnimationActive={animateCharts} animationDuration={700} type="monotone" dataKey="inProgress" stackId="mix" stroke="var(--color-inProgress)" fill="var(--color-inProgress)" fillOpacity={0.45} strokeWidth={2} />
                                        <Area isAnimationActive={animateCharts} animationDuration={700} type="monotone" dataKey="closed" stackId="mix" stroke="var(--color-closed)" fill="var(--color-closed)" fillOpacity={0.45} strokeWidth={2} />
                                    </AreaChart>
                                </ChartContainer>
                            </ChartCard>

                        </div>
                    </div>
                )}
            </main>
        </LayoutClient>
    )
}
