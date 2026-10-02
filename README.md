# Getic — Support Ticket Management Platform
> A modern, **multi-tenant** Customer Support ticketing platform built with Next.js 16, React 19, PostgreSQL, and Tailwind CSS. Every company works in its own sealed **organization ("room")** — tickets, notes, members and analytics are isolated server-side. Manage ticket lifecycles, invite your team by email or room ID, and watch it all on live dashboards — fronted by an animated marketing landing page.

---
# Description: 
Getic is a lightweight, full-stack helpdesk built for teams who are tired of paying enterprise prices for basic ticket tracking. Built with Next.js 16, PostgreSQL, and Tailwind, it handles the full ticket lifecycle—creation, status flow, bulk actions, and internal team notes—through a fast, keyboard-friendly data table. Updates feel instant thanks to optimistic UI and Zustand state, with automatic rollback on failure.

On top of the desk sits a **multi-tenant organization system**: each company is a "room" with its own members, roles and seat caps. People join by **email invite** (one click from the inbox, auto-accept) or by **room ID + password** with a confirmation screen. An animated **landing page at `/`** showcases the product; the app itself lives behind auth (`/tickets`, `/dashboard`, `/organization`, `/welcome`).

## 📌 Why I Built This

Support teams need a clean, centralized place to track incoming issues, update statuses, and document internal notes.

Most ticketing tools are bloated, slow, or require expensive subscriptions. I built **Getic** to solve the core problem of *"How do we manage, organize, and resolve support tickets efficiently without the clutter?"*

This project was built from scratch to demonstrate **end-to-end full-stack development**: from designing the PostgreSQL schema, to building REST APIs, to crafting a modern, interactive UI.

---

## ✨ Key Features

### 📝 Create, View, Edit & Delete Tickets
- Full lifecycle management with auto-generated sequential IDs (e.g., `TKT-001`).

### 📊 Interactive Data Table
- Powered by **TanStack Table v9**:
  - Global search across ID, subject, customer name, and email.
  - Sortable columns with a sticky header.
  - Multi-select row checkboxes for bulk deletion.
  - **Client-side pagination** — one full fetch on load, then filtering,
    sorting and page flips are instant (pure in-memory state). See
    `PAGINATION.md` for the design decision and the server-paged alternative.

### 🔍 Filter by Status
- Instantly switch between all, open, in-progress, and closed tickets.

### 💬 Internal Notes System
- Add private notes to any ticket. Deleting a ticket automatically removes its associated notes (cascading delete).

### ⚡ Optimistic UI with Real-time Toasts
- Updates happen instantly in the UI (Zustand), and the database syncs in the background.
- Success/Error feedback is shown via styled toasts.

### 🌙 Light & Dark Mode
- Smooth, native theme switching powered by `next-themes`.

### 🏢 Multi-Tenant Organizations ("rooms")
- Every ticket/Note row carries `organizationId`; **every query filters by the session's active org** - the tenant wall lives in `lib/rbac.ts`, not the UI.
- Switch rooms from the **header OrgSwitcher** or the `/organization` Select (loading spinner + toasts - switching is the slow call).
- Creating a room **promotes the creator to global ADMIN** (`organizationHooks.afterCreateOrganization`) and makes it active instantly.
- New users with no room land on **`/welcome`**: create, join by ID/password, or accept a pending email invite.
- Seat caps enforced **before** the invite row is written: <=10 ADMIN + <=1,000 AGENT per room.

### 🚪 Three Ways to Join a Room
1. **Email invite** - branded mail with an **Accept invitation** button (`/organization?invite=<id>`); signed-in receivers **auto-join**, signed-out ones are routed through login with the invite link preserved.
2. **Room ID + password** - admins share the code from the *Room access* card (copy/rotate/set-password); joiners get a **confirmation view** (room name + member avatar group + count) before joining as AGENT.
3. **Pending-invite inbox** - `/welcome` lists invitations addressed to your email with one-click Accept.
- **Privacy**: room name & members are returned **only** on correct credentials - wrong password and unknown ID return the identical generic 404 (nothing to probe).

### 👤 Roles - Global AND Per-Room
- **Global role** (`User.role`): ADMIN/AGENT - gates `/admin/users`, admin set-role, first-admin bootstrap.
- **Org seat role** (`Member.role`): OWNER/ADMIN/AGENT **per room** - a global admin visiting another room as an agent *acts* as an agent there.
- Every role-visible surface uses the **effective (org) role**: avatar badge, sidebar user menu, online-presence, Team page actions.
- Role changes **email the member** ("You are now an ADMIN...") with a join/open button; last-admin and self-change guards included.

### 🔐 Authentication & Sessions
- Sign in with **email/password, Google, or GitHub** (Better Auth, secure HMAC-signed cookies) - plus **6-digit OTP** email verification on signup and a full **forgot-password** flow.
- **Account linking**: a Google/GitHub sign-in with an existing credentials email **links** the identity instead of erroring (`account_not_linked` fix).
- **First-login welcome email** fires on the first session ever created (moved off signup, which fired pre-verification).
- Enforcement is server-side on every route (`lib/rbac.ts`) - hiding UI is only UX.

### 👪 Team Page + Live Presence
- **`/admin/users` is now the Team page of the ACTIVE room** - the roster always follows the room switcher (bug fix: it previously listed global users).
- Every member sees the roster read-only; room admins get Make admin / Make agent / Remove.
- **Online-agents avatar group** (admin-only, tickets + team pages): teammates of the active room heartbeating every 25s; hover expands to profile pictures, hover one shows the email.

### 📧 Email Notifications (SMTP via Nodemailer)
- **Resend was fully removed.** All mail now flows through one Nodemailer/SMTP sender (`lib/email.tsx`) with react-email templates in `emails/` (`pnpm email:dev` previews them).
- Nine flows: signup **OTP**, **welcome** (first login), **invite**, **promotion/demotion**, ticket **created**, **status changed**, password **reset**, plus a Settings smoke test.
- Without `SMTP_HOST` every mail is **logged to the dev console** (`[email:dev-only]`) - flows never break.

### 🌐 Animated Landing Page (`/`)
- Hero with drifting orbs + count-up stats, features, who-it's-for, how-it-works, Getic-vs-others comparison, testimonials, animated FAQ accordion, and a **parallax footer**.
- Scroll-reveal driven by one IntersectionObserver; `prefers-reduced-motion` respected.
- The tickets table moved to **`/tickets`**; all in-app links updated.

---
## 🛠️ Tech Stack

### Frontend & Framework

- **Core Framework**: [Next.js 16.2.6](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Library**: [React 19.2.4](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **State Management**: [Zustand 5.0](https://zustand-demo.pmnd.rs/)
- **Data Table**: [@tanstack/react-table 9.1](https://tanstack.com/table/v9)

### Styling & UI Components

- **CSS Engine**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: Base UI / shadcn/ui primitives
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theme Management**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Utilities**: `clsx`, `tailwind-merge`, `tw-animate-css`

### Database & Backend

- **Database**: PostgreSQL (hosted on Neon Serverless Postgres)
- **ORM**: [Prisma ORM 7.9](https://www.prisma.io/)
- **Driver Adapter**: `@prisma/adapter-pg` with `pg` connection pool
- **Validation**: [Zod 4](https://zod.dev/)

### Auth & Email

- **Authentication**: [Better Auth](https://www.better-auth.com/) (Prisma adapter) — email/password + Google & GitHub OAuth, **6-digit OTP verification**, forgot-password, **organization plugin** (multi-tenant rooms), **admin plugin** (global roles)
- **RBAC**: two layers — global `User.role` (admin plugin) + per-room `Member.role` (organization plugin), enforced server-side via `lib/rbac.ts`
- **Email**: Nodemailer/SMTP with react-email templates (`emails/`) — OTP, welcome, invite, promotion, ticket create/status, reset (console fallback in dev)

---

## 🏗️ High-Level Design (HLD)

### System Architecture


![Conceptual Design](./public/conceptual_diagram.png)

 ## 🏗️ Architecture

### High-Level Flow

1. **User interacts** with the UI (creates a ticket, changes status, adds a note).
2. **Zustand store** immediately updates the local state (optimistic UI) and triggers an API request.
3. **Next.js API Route** first verifies the session and role (Better Auth + `lib/rbac.ts`), then validates the request (Zod) and queries the database using **Prisma ORM**.
4. **PostgreSQL** saves the record. The store syncs the server response back to the UI.
5. If the request fails, the UI **rolls back** the optimistic change and shows an error toast.

---

## 📐 Low-Level Design (LLD)
### Class Diagram
<!--
classDiagram
    direction TB

    %% Client-Side UI Components (React 19)
    class MainDashboard {
        +renderTable()
        +handleFilter()
        +handleBulkDelete()
    }
    class Layout {
        +renderHeader()
        +toggleTheme()
    }
    class TicketFormDialog {
        +customerName: String
        +customerEmail: String
        +subject: String
        +description: String
        +handleSubmit()
    }
    class TicketViewDialog {
        +ticket: Ticket
        +notes: Note[]
        +renderTimeline()
    }
    class TicketNoteDialog {
        +notesText: String
        +handleAddNote()
    }
    class DeleteConfirmDialog {
        +ticketIds: Int[]
        +handleConfirm()
    }

    %% Client State Management (Zustand)
    class useTicketStore {
        +tickets: Ticket[]
        +isLoading: Boolean
        +fetchTickets() Promise
        +createTicket(data) Promise
        +updateTicketStatus(id, status) Promise
        +addNote(ticketId, text) Promise
        +deleteTicket(id) Promise
        +bulkDelete(ids) Promise
    }

    %% Serverless API Route Handlers (Next.js 16)
    class TicketsAPI {
        +GET() list
        +POST() create
        +DELETE() bulkDelete
    }
    class TicketIdAPI {
        +PATCH(id) update
        +DELETE(id) singleDelete
    }
    class TicketNotesAPI {
        +GET(id) listNotes
        +POST(id) addNote
    }

    %% Database ORM (Prisma ORM 7 & PostgreSQL)
    class PrismaClient {
        +ticket: TicketDelegate
        +note: NoteDelegate
    }

    class Ticket {
        +id: Int (PK)
        +ticketId: String (UK)
        +customerName: String
        +customerEmail: String
        +subject: String
        +description: String
        +status: StatusEnum
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Note {
        +id: Int (PK)
        +ticketId: Int (FK)
        +notesText: String
        +createdAt: DateTime
    }

    %% Relationships & Communication
    MainDashboard ..> useTicketStore : uses
    Layout ..> useTicketStore : uses
    TicketFormDialog ..> useTicketStore : uses
    TicketViewDialog ..> useTicketStore : uses
    TicketNoteDialog ..> useTicketStore : uses
    DeleteConfirmDialog ..> useTicketStore : uses

    useTicketStore ..> TicketsAPI : HTTP JSON REST (Optimistic Sync)
    useTicketStore ..> TicketIdAPI : HTTP JSON REST (Optimistic Sync)
    useTicketStore ..> TicketNotesAPI : HTTP JSON REST (Optimistic Sync)

    TicketsAPI ..> PrismaClient : invokes
    TicketIdAPI ..> PrismaClient : invokes
    TicketNotesAPI ..> PrismaClient : invokes

    PrismaClient ..> Ticket : queries
    PrismaClient ..> Note : queries

    Ticket "1" -- "0..*" Note : has many (Cascade Delete)
 -->
![class](./public/class_diagram.png)

### Sequence Diagram
<!--
sequenceDiagram
    participant UI as Browser (React 19)
    participant Store as Zustand (lib/store.ts)
    participant API as Next.js API Routes
    participant DB as Neon PostgreSQL (Prisma)

    UI->>Store: Submit Form Action
    Store->>UI: Apply Optimistic Update & Show Toast
    Store->>API: Asynchronous POST/PATCH Request
    API->>DB: Execute SQL Transaction
    DB->>API: Return Persisted Metadata
    API->>Store: 201 Created / 200 OK
    Store->>UI: Reconcile State & Update Toast Success
    Note over Store, UI: If Error: Rollback state & show error toast
 -->

![Sequence Diagram](./public/sequence_diagram.png)

### Database Entity Relationship Diagram (ERD)
<!--
```mermaid
erDiagram
    TICKET {
        Int id PK "Autoincrement primary key"
        String ticketId UK "Formatted ticket code, e.g. TKT-001"
        String customerName "Name of the customer"
        String customerEmail "Customer email address"
        String subject "Ticket topic/headline"
        String description "Detailed issue report"
        Status status "Enum: OPEN | IN_PROGRESS | CLOSED"
        DateTime createdAt "Timestamp of creation"
        DateTime updatedAt "Timestamp of last modification"
    }

    NOTE {
        Int id PK "Autoincrement primary key"
        Int ticketId FK "References TICKET(id)"
        String notesText "Content of internal note"
        DateTime createdAt "Timestamp of note entry"
    }

    TICKET ||--o{ NOTE : "has many (cascade delete)"
```
--->
![ER Diagram](./public/er_diagram.png)


Component Hierarchy & Module Breakdown

```
app/
├── layout.tsx                --> Root HTML layout wrapped in ThemeProvider

├── page.tsx                  --> Animated marketing landing page (hero, features, FAQ, parallax footer)
├── tickets/page.tsx          --> The tickets table (LayoutClient + Main)
├── welcome/page.tsx          --> Onboarding for org-less users: create / join by ID+pass / accept invites
├── globals.css               --> Tailwind CSS design tokens & animations
├── login/page.tsx            --> Sign-in: credentials, Google/GitHub OAuth, OTP routes
├── organization/page.tsx      --> Org switcher/create/invite + members + Room access + join-by-ID
├── signup/page.tsx           --> Sign-up: name, email, password
├── admin/users/page.tsx      --> Team page of the ACTIVE room (roster; admins get role/remove actions)
├── api/                      --> Next.js REST API Route Handlers
    ├── tickets/
    │   ├── route.ts          --> GET (list), POST (create), DELETE (bulk)
    │   └── [id]/
    │       ├── route.ts      --> PATCH (update), DELETE (single)
    │       └── notes/
    │           └── route.ts  --> GET (list notes for ticket), POST (add note)
    ├── notes/
    │   └── route.ts          --> GET (all notes), POST (global create note)
    ├── auth/[...all]/route.ts --> Better Auth mount (sign-in/up, OAuth, OTP, organization + admin plugins)
    ├── members/role/route.ts   --> Org role change + promotion email
    ├── org/access/route.ts     --> Join code & password (admin)
    ├── org/join/route.ts       --> Join by room ID (+password) as AGENT
    ├── org/join/preview/route.ts --> Room confirmation (name+members, privacy-gated)
    ├── my-invitations/route.ts --> My pending email invites
    └── presence/route.ts       --> Who-is-online heartbeat + list (org-scoped)

components/
├── main.tsx                  --> Main dashboard container with filter controls & header stats
├── layout.tsx                --> App navigation header, search bar, & theme switcher
├── ticket-form-dialog.tsx    --> Dialog modal for ticket creation & editing
├── ticket-view-dialog.tsx    --> Detailed ticket modal with status flow & internal log feed
├── ticket-note-dialog.tsx    --> Quick internal note creation modal
├── delete-confirm-dialog.tsx --> Confirmation dialog for single & bulk deletions
├── auth-gate.tsx             --> Client session gate (redirects to /login when signed out)
└── user-menu.tsx             --> Header avatar menu: role badge, admin link, sign out

lib/
├── prisma.ts                 --> Prisma Client singleton with PostgreSQL driver adapter
├── store.ts                  --> Zustand state store (optimistic updates, async API calls)
├── utils.ts                  --> Utility class names merger (clsx + tailwind-merge)
├── auth.ts                   --> Better Auth server (providers, OTP, org+admin plugins, hooks: first-admin, welcome-on-first-login, creator-promotion, invite email)
├── auth-client.ts            --> Browser auth client (signIn / useSession, admin + organization plugins)
├── access.ts                 --> Role vocabulary: global (admin plugin) + org (OWNER/ADMIN/AGENT) + ORG_LIMITS
├── rbac.ts                   --> Server gates: requireUser / requireRole / requireOrgUser / requireOrgRole (tenant wall)
├── email.tsx                 --> Nodemailer/SMTP sender + react-email render (console fallback in dev)
├── use-effective-role.ts     --> Org-aware role hook (active room's seat role)
```

---

## 🔐 Authentication, Roles, Organizations & Email

- **Better Auth** is mounted at `/api/auth/*` (`app/api/auth/[...all]/route.ts`), backed by the **same PostgreSQL database** via the Prisma adapter (`User`, `Session`, `Account`, `Verification` + `Organization`, `Member`, `Invitation` tables live next to `Ticket`/`Note`).
- **Sign-in methods**: email + password, **Google OAuth**, **GitHub OAuth**, plus **6-digit OTP** (signup verification and OTP sign-in). A provider identity **links** onto an existing credentials account with the same email (`requireLocalEmailVerified: false`) instead of erroring.
- **Two role layers**:
  - *Global* `User.role` = `ADMIN | AGENT` (admin plugin). New signups are AGENT; `FIRST_ADMIN_EMAIL` auto-promotes that address; **creating a room also promotes to ADMIN** (`organizationHooks.afterCreateOrganization`).
  - *Per-room* `Member.role` = `OWNER | ADMIN | AGENT` (organization plugin). **Effective role = your seat in the ACTIVE room** — every role-aware surface (avatar badge, sidebar user menu, Team page actions, presence) uses `lib/use-effective-role.ts`.
- **Tenant wall**: every ticket/note route resolves the session's `activeOrganizationId`, verifies membership, and filters by it (`requireOrgUser`/`requireOrgRole` in `lib/rbac.ts`). Cross-org ids get 404/403.
- **Organizations**: switch (header OrgSwitcher / `/organization` Select with spinner+toasts), create (creator becomes ADMIN + room activates), invite by email (seat caps ≤10 ADMIN/≤1,000 AGENT enforced in the `sendInvitationEmail` hook *before* the row is written), join by **room ID + optional password** (`/api/org/join/preview` returns name+members only on exact match — wrong password and unknown ID give the same generic 404), accept invites (auto-join on `/organization?invite=<id>`; AuthGate preserves the query through login).
- **Team page** (`/admin/users`, sidebar "Team"): the ACTIVE room's roster via `getFullOrganization` — read-only for members, Make admin/Make agent (emails the member via `/api/members/role` → better-auth `updateMemberRole` + `sendRoleChangedEmail`) and Remove for room admins. Re-reads on every org switch.
- **Presence**: open pages heartbeat `/api/presence` every 25s (org-scoped rows, 60s online window); admins see the same-room avatar group on the tickets and team pages.
- **Email (Nodemailer/SMTP)**: one sender (`lib/email.tsx`), react-email templates in `emails/`. Flows: OTP, welcome (first **session** — `databaseHooks.session.create.after`), invite, role change, ticket created, ticket status changed, password reset, Settings smoke test. **No `SMTP_HOST` → every mail is console-logged (`[email:dev-only]`) and no flow ever breaks.**

### Environment variables (auth, orgs & email)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon or local) |
| `BETTER_AUTH_SECRET` | Session signing secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App base URL — must match OAuth callback registrations; invite/reset links are built on it |
| `FIRST_ADMIN_EMAIL` | Sign-up address auto-promoted to ADMIN (leave empty to disable) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth — authorized redirect: `{BETTER_AUTH_URL}/api/auth/callback/google` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth — callback URL: `{BETTER_AUTH_URL}/api/auth/callback/github` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP relay (e.g. `smtp.gmail.com`, 465, `true`). **Without `SMTP_HOST` every email is console-logged, nothing sends** |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (Gmail: an **App Password**, not the login password) |
| `EMAIL_FROM` | Sender header, e.g. `Getic <noreply@yourdomain.com>` (default: `Getic <noreply@getic.local>`) |

---

## 📡 API Routes Reference

### 1. Tickets Endpoint — `/api/tickets`

#### `GET /api/tickets`

**Two modes:**

Fetches **all** tickets ordered by creation date descending, including nested internal notes. The client fetches this once and does filtering/search/pagination in memory (see `PAGINATION.md` for the design decision).

- **Response Body Example (200 OK)**:

```json
[
  {
    "id": 1,
    "ticketId": "TKT-001",
    "customerName": "Alice Smith",
    "customerEmail": "alice@example.com",
    "subject": "Payment gateway timeout",
    "description": "Customer was charged but transaction timed out on checkout.",
    "status": "OPEN",
    "createdAt": "2026-08-14T10:15:30.000Z",
    "updatedAt": "2026-08-14T10:15:30.000Z",
    "notes": [
      {
        "id": 1,
        "ticketId": 1,
        "notesText": "Contacted payment processor to check transaction ID.",
        "createdAt": "2026-08-14T10:20:00.000Z"
      }
    ]
  }
]
```

#### `POST /api/tickets`

Creates a new support ticket and automatically generates a padded string ticket identifier (e.g. `TKT-001`).

- **Request Body Example**:

```json
{
  "customerName": "John Doe",
  "customerEmail": "john.doe@company.com",
  "subject": "Unable to reset password",
  "description": "Password reset email link throws 404 error."
}
```

- **Response Body Example (201 Created)**:

```json
{
  "id": 2,
  "ticketId": "TKT-002",
  "customerName": "John Doe",
  "customerEmail": "john.doe@company.com",
  "subject": "Unable to reset password",
  "description": "Password reset email link throws 404 error.",
  "status": "OPEN",
  "createdAt": "2026-08-14T11:00:00.000Z",
  "updatedAt": "2026-08-14T11:00:00.000Z"
}
```

#### `DELETE /api/tickets`

Deletes multiple tickets in bulk by supplying an array of primary key IDs.

- **Request Body Example**:

```json
{ "ids": [1, 2, 3] }
```

- **Response Body Example (200 OK)**:

```json
{ "success": true }
```

---

### 2. Single Ticket Endpoint — `/api/tickets/[id]`

#### `PATCH /api/tickets/[id]`

Updates one or more fields of a specific ticket (such as status, subject, customer details, or description).

- **URL Params**: `id` (integer primary key)
- **Request Body Example**:

```json
{
  "status": "IN_PROGRESS",
  "subject": "Updated: Payment gateway timeout"
}
```

- **Response Body Example (200 OK)**:

```json
{
  "id": 1,
  "ticketId": "TKT-001",
  "customerName": "Alice Smith",
  "customerEmail": "alice@example.com",
  "subject": "Updated: Payment gateway timeout",
  "description": "Customer was charged but transaction timed out on checkout.",
  "status": "IN_PROGRESS",
  "createdAt": "2026-08-14T10:15:30.000Z",
  "updatedAt": "2026-08-14T11:25:00.000Z"
}
```

#### `DELETE /api/tickets/[id]`

Deletes a single ticket by its integer ID (and cascades delete to associated notes).

- **URL Params**: `id` (integer primary key)
- **Response Body Example (200 OK)**:

```json
{ "success": true }
```

---

### 3. Ticket Notes Endpoint — `/api/tickets/[id]/notes`

#### `GET /api/tickets/[id]/notes`

Retrieves all internal notes tied to a specific ticket ID.

- **Response Body Example (200 OK)**:

```json
[
  {
    "id": 1,
    "ticketId": 1,
    "notesText": "Issue reported to engineering level 2.",
    "createdAt": "2026-08-14T10:30:00.000Z"
  }
]
```

#### `POST /api/tickets/[id]/notes`

Appends a new internal note to the specified ticket ID and updates the ticket's `updatedAt` field.

- **Request Body Example**:

```json
{ "notesText": "Customer confirmed system is working properly now." }
```

- **Response Body Example (201 Created)**:

```json
{
  "id": 2,
  "ticketId": 1,
  "notesText": "Customer confirmed system is working properly now.",
  "createdAt": "2026-08-14T11:30:00.000Z"
}
```

---

### 4. Global Notes Endpoint — `/api/notes`

#### `GET /api/notes?ticketId=1`

Fetches all internal notes globally, or filters by optional query parameter `?ticketId=`.

- **Response Body Example (200 OK)**:

```json
[
  {
    "id": 1,
    "ticketId": 1,
    "notesText": "System check complete.",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
]
```

#### `POST /api/notes`

Global endpoint to post an internal note by supplying `ticketId` in the JSON request body.

- **Request Body Example**:

```json
{ "ticketId": 1, "notesText": "Verified refund processed on payment portal." }
```

- **Response Body Example (201 Created)**:

```json
{
  "id": 3,
  "ticketId": 1,
  "notesText": "Verified refund processed on payment portal.",
  "createdAt": "2026-08-14T11:32:00.000Z"
}
```
## 🏲 Organization & Presence API (multi-tenant)

Better Auth's org plugin endpoints (`/api/auth/organization/*`: `create`, `set-active`, `list`,
`get-full-organization`, `invite-member`, `accept-invitation`, `remove-member`,
`update-member-role`, …) are mounted automatically by `lib/auth.ts`. On top of them:

### `POST /api/members/role` — org role change + email
Body `{ memberId | userId, role: "ADMIN"|"AGENT" }` (session's active org). ADMIN/OWNER only;
self-change and last-admin guards; writes via better-auth `updateMemberRole`, then emails the
member (`sendRoleChangedEmail`). Returns `{ success, member, emailed }`.

### `GET|POST /api/org/access` — room ID & password (ADMIN/OWNER)
`GET` → `{ joinCode, hasPassword }`. `POST` → `{ rotateCode?: true, password?: string|null }`
(rotate the 8-char code and/or set/clear the scrypt-hashed password).

### `POST /api/org/join/preview` — confirm a room before joining
Body `{ code, password? }`. **Only correct credentials return the room**:
`{ name, memberCount, members[], alreadyMember }`. Wrong password, missing password and unknown
code all return the identical `404 {"error":"Room not found"}` — no probing possible.

### `POST /api/org/join` — join by room ID
Body `{ code, password? }`. Same credential check; adds the caller as an **AGENT** seat
(seat-capped) and activates the room. Already-a-member → `409 { alreadyMember: true, organizationId }`.

### `GET /api/my-invitations` — my pending invites
Invitation rows addressed to the session user's email (pending, unexpired), for the `/welcome`
inbox. `POST /api/presence` heartbeats and `GET /api/presence` returns the active room's online
members (25s heartbeat / 60s window).

---

## ⚡ Challenges Faced and Solved

### 1. Sorting was broken on the first click (TanStack Table v9)
- **Problem:** TanStack v9 requires explicit feature registration. Without the right row model, clicking a header updated the UI but didn't actually sort the data.
- **Solution:** Manually registered `sortedRowModel: createSortedRowModel()` and `sortFns` in my table features config, and built a reusable `SortableHeader` component for consistent behavior.

### 2. Sticky table header didn't stick
- **Problem:** The default Shadcn table wrapper has a nested `overflow-x-auto` container, which breaks `position: sticky` on the header.
- **Solution:** Consolidated the table into a single scroll container and applied `sticky top-0 z-10` directly to the `<thead>`.

### 3. Next.js 16 changed API params to a Promise
- **Problem:** Dynamic route params (`params.id`) are now returned as a Promise, causing runtime errors in my API handlers.
- **Solution:** Updated all route handlers to use `{ params }: { params: Promise<{ id: string }> }` and properly `await params` before accessing data.

### 4. Auto-generating clean `TKT-001` IDs
- **Problem:** Standard integer primary keys (1, 2, 3) lack domain context.
- **Solution:** Implemented a pattern where the auto-increment `id` is fetched first, then mapped to `TKT-${String(id).padStart(3, '0')}` before returning the response.

### 5. Optimistic state without complex side effects
- **Problem:** Network latency made the UI feel sluggish when updating statuses or deleting items.
- **Solution:** Built a Zustand store with optimistic updates. The UI changes instantly, and if the server responds with an error, the state is automatically rolled back.

*Continued during the multi-tenant build-out (Sep 29–30, 2026):*

### 6. Landing sections weren't full device height
- **Problem:** Every section showed a slice of the next one ("half cut"), which looked broken at any viewport.
- **Solution:** A shared `Section` component (`min-h-svh`, vertically centered content, one texture pattern per section) so each screen owns exactly one viewport; hero and parallax footer were reworked to match.

### 7. Navbar choreography: glass, hide-on-scroll, mobile menu
- **Problem:** The navbar needed a glass look that still reads in dark mode, had to leave the view when scrolling down past the Features section, return on any scroll-up, revert to the default bar at the very top — and collapse on mobile.
- **Solution:** A rAF-throttled scroll handler drives a `default | floated | hidden` state machine (translate-y + opacity transitions). Theme-aware glass tokens (brighter `white/15` borders in dark mode) keep edges visible; a slide-over menu handles mobile; a scroll-to-top arrow finishes the loop.

### 8. "Who it's for" icons went blank on hover
- **Problem:** The 3D-tilt cards' cursor-spotlight overlay painted *above* the content, washing icons out on hover; the trailing arrow served no purpose.
- **Solution:** Stacked the card content in a `z-[1]` layer above the spotlight and removed the arrow.

### 9. The landing mock lied about the product
- **Problem:** The how-it-works diagram showed assignees and queue behavior the app doesn't have — and the first two carousel steps were static next to an animated third.
- **Solution:** Rebuilt the mocks around the REAL pipeline (Open → In Progress → Closed + customer email on every status change; no assignees — Getic is a shared queue). React-state loops light the active stage, march the connector dashes, ping the mail line, and flip an invite row to "Joined" — every animation honest to the schema and honoring `prefers-reduced-motion`.

### 10. Signup felt slow and silent
- **Problem:** Users stared at an inert button while the account was created.
- **Solution:** Split-screen auth pages with a staged loader overlay ("Securing your account → Preparing your workspace → Almost there") so the wait reads as progress.

### 11. New users landed on the marketing page (with a phantom personal org)
- **Problem:** Signup redirected to `/` (the landing page), and a better-auth hook auto-created a personal organization — so nobody ever saw onboarding.
- **Solution:** Removed personal-org auto-creation from the `user.create.after` hook; `/` bounces signed-in users into `/tickets`; a client `OrgGate` routes org-less users to `/welcome` — an invite-first screen (accept invitation / create room / join by room ID + password).

### 12. The org Select covered its own current value
- **Problem:** Base UI's default `alignItemWithTrigger` aligns the popup's selected item *on top of* the trigger, hiding the value it displays.
- **Solution:** `alignItemWithTrigger={false}` on the org switcher and the invite dialog, so popups open *below* the trigger (verified by measuring the popup gap in the browser).

### 13. A fresh signup saw `/tickets` flash before `/welcome`
- **Problem:** OrgGate rendered the full app shell *while* the org list was still fetching (~1–2 s on Neon), then bounced to `/welcome` — a jarring flash of a page the user can't use.
- **Solution:** OrgGate now renders a neutral spinner while the list resolves, so the redirect decision happens before any protected UI paints. Verified by sampling the DOM every 40 ms through the transition: no tickets content ever appears.

### 14. "GetiC" vs "Getic" — including in the database
- **Problem:** Seed data said "GetiC (legacy data)" in Neon; fixing the migration file post-apply would corrupt its checksum.
- **Solution:** Swept all 39 source occurrences with `sed` (email templates, From lines, seed, docs), then renamed the live rows (2 organizations + 1 activity entry) through a temporary dev-only route using the app's Prisma client — deleted immediately after.

### 15. Console noise: image warnings, rejected cookies, unused font preloads
- **Problem:** A next/image aspect warning on the sidebar logo; GitHub-hosted avatars had their cross-site cookies rejected in the browser; Google fonts were preloaded on every page, including ones that never use them.
- **Solution:** True intrinsic dimensions plus explicit two-sided CSS sizing (Tailwind preflight's `img { height: auto }` makes one-sided sizing warn), avatars vendored into `public/avatars/`, and `preload: false` on landing-only fonts — Playwrite has no preloadeable subsets, so Next force-disables its preload regardless (its generated type omits the option).

### 16. The mocks animated behind the scenes
- **Problem:** The carousel mocks ran their loops on mount, so scrolling to "How it works" always landed mid-animation.
- **Solution:** A `useInView` IntersectionObserver gate: mocks run only while on screen and *restart from stage 0* on every re-entry; the analytics ticker freezes off-screen via `animation-play-state`.

### 17. The Team page didn't fit a phone
- **Problem:** Role-change and remove buttons, big ADMIN/AGENT badges, the header org-switcher and presence avatars all overflowed a 320 px viewport.
- **Solution:** Per-row ⋯ dropdown holding every action, a compact ShieldCheck/user icon instead of badges, admins sorted above agents, the header org-switcher hidden on mobile (the sidebar chip covers it), presence avatars hidden below `sm`, and a mobile-only combined filter menu on the tickets toolbar (Status + View behind one filter icon with an active-count badge).

### 18. No audit trail — and invite logging was only code-verified
- **Problem:** Nothing showed invites, joins or role changes; the seed path bypassed plugin hooks, so INVITE_SENT logging had never been exercised at runtime.
- **Solution:** An `Activity` model + migration, a never-throws `logActivity()` wired into better-auth's `organizationHooks` (ORG_CREATED, INVITE_SENT/ACCEPTED, MEMBER_REMOVED, ROLE_CHANGED) and every ticket route, and a `/notifications` feed merging org events with live pending invitations. Verified end-to-end through the real UI: invite → accept → both events in the feed.

### 19. Dashboard cards were half-cut on mobile, and day-range changes snapped
- **Problem:** At 320 px the stat-card badges ("↗ 33%", "44% of all") overflowed their 2-column grid cells, clipping half the card content; and switching the charts between 7/14/30 days swapped the data with no transition.
- **Solution:** Badges are hidden below `sm` (the numbers and footnotes carry the meaning on mobile), and the two daily charts (Ticket Growth, Workload Composition) now play a ~0.7 s morph animation only for ~1 s after a range change — mount stays static per the no-rAF-in-background-tabs rule, and a ref skips the very first render so opening the dashboard never animates.

### 20. Tooling gotchas (Windows + pnpm + Neon)
- **Problem:** `tsx` scripts hang on Neon's keep-alive; large heredocs truncate; `write_file` on existing files can corrupt; a running dev server keeps serving the stale Prisma client after `prisma generate` (APIs 500 with empty bodies).
- **Solution:** Plain `node` scripts (via a temp app route when the client is TS-only at a custom output path), write-`.new`-then-`mv` for full-file rewrites followed by grep + brace-balance checks, and a dev-server restart after every generate. One more: React's dev-only "effect deps size changed" error after editing hooks is a Fast Refresh artifact — a reload clears it; it cannot recur from fresh loads.

---

## To Do:
- ~~Only fetch data based on the pagination and no. of rows selected~~ — evaluated (server paging was implemented and reverted); **client-side wins at this scale**, decision record in `PAGINATION.md`
- ~~Make the globalSearch fetch data from database~~ — moot with the full-array fetch: search already sees every ticket
- Implement Debouncing on globalSearch (only worth it if search moves to SQL)
- ~~Add auth~~ — **shipped**: Better Auth (email/password + Google/GitHub OAuth), `ADMIN`/`AGENT` RBAC enforced on all API routes, Resend email notifications. Remaining: flip `requireEmailVerification` to `true` once verified end-to-end with a live Resend key
  
## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **Package Manager**: `pnpm`, `npm`, or `yarn`
- **Database**: PostgreSQL connection URI

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/greyart93/getic.git
cd getic
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your database URL, plus the auth/email keys (every variable is documented in `.env.example`; only `DATABASE_URL` is strictly required — OAuth buttons and real email sending activate when their keys are present):

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/getic_db?sslmode=require"
```

4. **Run database migrations & Prisma generation**

```bash
pnpx prisma migrate deploy   # applies the committed migrations (or `pnpx prisma db push` for a scratch DB)
pnpx prisma generate
```

5. **(Optional) Seed initial data**

```bash
pnpx prisma db seed
```

6. **Start the development server**

```bash
pnpm dev
```

7. **Open the application**

Navigate to <http://localhost:3000> — the **animated landing page**. From there: **Sign in** (or `/signup`; set `FIRST_ADMIN_EMAIL` beforehand to make that account ADMIN). New users land on `/welcome` to create or join an organization; the app itself lives at `/tickets`, `/dashboard`, `/organization` and the Team page.

---

## 📜 License


Distributed under the MIT License. See `LICENSE` for more information.
