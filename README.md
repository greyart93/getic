# Getic — Support Ticket Management Platform

> A modern, full-stack Customer Support ticketing dashboard built with Next.js 16, React 19, PostgreSQL, and Tailwind CSS. Manage ticket lifecycles, search across thousands of records, and collaborate with your team—all from a single, fast, and responsive interface.

---

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
  - Pagination control (rows per page).

### 🔍 Filter by Status
- Instantly switch between all, open, in-progress, and closed tickets.

### 💬 Internal Notes System
- Add private notes to any ticket. Deleting a ticket automatically removes its associated notes (cascading delete).

### ⚡ Optimistic UI with Real-time Toasts
- Updates happen instantly in the UI (Zustand), and the database syncs in the background.
- Success/Error feedback is shown via styled toasts.

### 🌙 Light & Dark Mode
- Smooth, native theme switching powered by `next-themes`.

---

## 🖼️ Application Screenshots

<!-- IMAGE SECTION: --->

| **Ticket Table** | **Ticket Details & Internal Notes** |
| :---: | :---: |
| ![Ticket Table](./public/tickets.png) | ![Ticket View & Notes Modal](./public/view_ticket.png) |

| **Create/ Edit Ticket Modal** | **Delete Ticket Modal** |
| :---: | :---: |
| ![Create Ticket Modal](./public/new_ticket.png) | ![Delete Ticket Modal](./public/delete_ticket.png) |

| **Create Note Modal** | **DashBoard View** |
| :---: | :---: |
| ![Create Note Modal](./public/add_note.png) | ![DashBoard](./public/dashbaord.png) |

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

---

## 🏗️ High-Level Design (HLD)

### System Architecture


![Conceptual Design](./public/conceptual_diagram.png)

 ## 🏗️ Architecture

### High-Level Flow

1. **User interacts** with the UI (creates a ticket, changes status, adds a note).
2. **Zustand store** immediately updates the local state (optimistic UI) and triggers an API request.
3. **Next.js API Route** validates the request (Zod) and queries the database using **Prisma ORM**.
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

├── page.tsx                  --> Entry point rendering LayoutClient & Main components
├── globals.css               --> Tailwind CSS design tokens & animations
└── api/                      --> Next.js REST API Route Handlers
    ├── tickets/
    │   ├── route.ts          --> GET (list), POST (create), DELETE (bulk)
    │   └── [id]/
    │       ├── route.ts      --> PATCH (update), DELETE (single)
    │       └── notes/
    │           └── route.ts  --> GET (list notes for ticket), POST (add note)
    └── notes/
        └── route.ts          --> GET (all notes), POST (global create note)

components/
├── main.tsx                  --> Main dashboard container with filter controls & header stats
├── layout.tsx                --> App navigation header, search bar, & theme switcher
├── ticket-form-dialog.tsx    --> Dialog modal for ticket creation & editing
├── ticket-view-dialog.tsx    --> Detailed ticket modal with status flow & internal log feed
├── ticket-note-dialog.tsx    --> Quick internal note creation modal
└── delete-confirm-dialog.tsx --> Confirmation dialog for single & bulk deletions

lib/
├── prisma.ts                 --> Prisma Client singleton with PostgreSQL driver adapter
├── store.ts                  --> Zustand state store (optimistic updates, async API calls)
└── utils.ts                  --> Utility class names merger (clsx + tailwind-merge)
```

---

## 📡 API Routes Reference

### 1. Tickets Endpoint — `/api/tickets`

#### `GET /api/tickets`

Fetches all tickets from the database ordered by creation date descending, including their nested internal notes.

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

Copy `.env.example` to `.env` and fill in your database URL:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/getic_db?sslmode=require"
```

4. **Run database migrations & Prisma generation**

```bash
pnpx prisma db push
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

Navigate to <http://localhost:3000> in your browser.

---

## 📜 License


Distributed under the MIT License. See `LICENSE` for more information.
