//
// ─── TICKET & NOTE TYPES + MOCK DATA ────────────────────────────────────
// The `Ticket` type below is what the zustand store and every component use.
// It mirrors the Prisma `Ticket` model but is hand-written (Prisma generates
// its own types in app/generated/prisma — unifying the two is a known TODO).
//
// ⚠️ The `tickets` array at the bottom is LEGACY MOCK DATA. It's no longer
// fetched — components load from GET /api/tickets (Postgres) — but keep it
// while some code still references the shape (columns.tsx types, tests).
//
// Dates: `createdAt`/`updatedAt` hold RAW ISO UTC strings from the API.
// `date` is the legacy pre-formatted display string from mock-data days.

export type Note = {
    id: number
    ticketId: number
    notesText: string
    createdAt?: string
}

export type Ticket = {
    id: number
    ticketId: string
    customerName: string
    customerEmail: string
    subject: string
    description: string
    status: 'OPEN' | 'IN PROGRESS' | 'CLOSED' | 'IN_PROGRESS'  // 👈 note both IN PROGRESS spellings; see PATCH normalization in app/api/tickets/[id]/route.ts
    date: string
    createdAt?: string
    updatedAt?: string
    notes?: Note[]
}

// 👇 LEGACY MOCK DATA — see file header. Real data comes from the API.
export const tickets: Ticket[] = [
    {
        id: 1,
        ticketId: 'TKT-001',
        customerName: 'art',
        customerEmail: 'art@gmail.com',
        subject: "UI bug",
        description: "bg-color is outside of the border",
        status: 'IN PROGRESS',
        date: '07/Nov/2026'
    },
    {
        id: 2,
        ticketId: 'TKT-002',
        customerName: 'art',
        customerEmail: 'art@gmail.com',
        subject: "form bug",
        description: "form is not submitting",
        status: 'OPEN',
        date: '02/Feb/2020'
    },
    {
        id: 3,
        ticketId: 'TKT-003',
        customerName: 'art',
        customerEmail: 'art@gmail.com',
        subject: "frontend issue",
        description: "front-end text is small",
        status: 'CLOSED',
        date: '25/Dec/2025'
    },
    {
        id: 4,
        ticketId: 'TKT-004',
        customerName: 'bob',
        customerEmail: 'bob@gmail.com',
        subject: "Server error",
        description: "SSR out of control",
        status: 'IN PROGRESS',
        date: '23/Apr/2022'
    },
    {
        id: 5,
        ticketId: 'TKT-005',
        customerName: 'art',
        customerEmail: 'art@gmail.com',
        subject: "UI bug",
        description: "bg-color is outside of the border",
        status: 'IN PROGRESS',
        date: '07/Nov/2026'
    },
    {
        id: 6,
        ticketId: 'TKT-006',
        customerName: 'art',
        customerEmail: 'art@gmail.com',
        subject: "form bug",
        description: "form is not submitting",
        status: 'OPEN',
        date: '02/Feb/2020'
    },
    {
        id: 7,
        ticketId: 'TKT-007',
        customerName: 'art',
        customerEmail: 'art@gmail.com',
        subject: "frontend issue",
        description: "front-end text is small",
        status: 'CLOSED',
        date: '25/Dec/2025'
    },
    {
        id: 8,
        ticketId: 'TKT-008',
        customerName: 'bob',
        customerEmail: 'bob@gmail.com',
        subject: "Server error",
        description: "SSR out of control",
        status: 'IN PROGRESS',
        date: '23/Apr/2022'
    },
]