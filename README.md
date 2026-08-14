# Getic — Customer Support & Ticket Management Platform

> A high-performance, enterprise-grade Customer Support & Helpdesk platform designed for modern support teams. Built with Next.js 16, React 19, Prisma ORM 7, PostgreSQL, and Zustand.

---

## 📌 Overview (What is it?)

**Getic** is a full-stack Customer Support Ticket Management system crafted to streamline helpdesk workflows, track customer inquiries, and maintain internal audit notes in real time. 

It provides support engineering teams with an intuitive, centralized dashboard to monitor incoming requests, manage ticket lifecycles (Open $\rightarrow$ In Progress $\rightarrow$ Closed), execute bulk operations, and add internal collaborator notes without cluttering the customer interaction.

---

## 🎯 Key Functionalities (What it does)

- **Automated Ticket Sequential ID Generation**: Automatically assigns human-readable, sequence-padded ticket identifiers (e.g., `TKT-001`, `TKT-002`) upon creation.
- **Full Ticket Lifecycle Management**: Full CRUD capabilities to create, view, update status/details, single delete, and bulk delete support requests.
- **Advanced Interactive Data Table**: Powered by `@tanstack/react-table` v9 with:
  - Multi-column global search & filtering (by ticket ID, customer name, email, or subject).
  - Multi-row selection for batch operations (e.g., bulk ticket deletion).
  - Column visibility toggling.
  - Sorting and customized pagination control.
- **Internal Note & Audit Trail System**: Dedicated notes modal allowing support agents to log internal observations, activity timestamps, and resolution steps for any ticket.
- **Optimistic State Management**: Powered by Zustand v5 for zero-latency UI updates with automatic background database synchronization and error fallback rollback.
- **Real-Time Toast Notifications**: Interactive, styled toast notification feedback for pending operations, success states, and error handling.
- **Theme Customization**: Fluid dark and light mode switching supported natively via `next-themes`.

---

## 🖼️ Application Screenshots

<!-- PLACEHOLDER FOR IMAGE SECTION: Paste your application screenshots below -->

| **Dashboard View** | **Ticket Details & Internal Notes** |
| :---: | :---: |
| ![Getic Dashboard View](https://placehold.co/800x450/0f172a/64748b?text=Paste+Dashboard+Screenshot+Here) | ![Ticket View & Notes Modal](https://placehold.co/800x450/0f172a/64748b?text=Paste+Ticket+View+%26+Notes+Modal+Here) |

| **Create / Edit Ticket Modal** | **Bulk Action & Dark/Light Theme** |
| :---: | :---: |
| ![Create Ticket Modal](https://placehold.co/800x450/0f172a/64748b?text=Paste+Create+Ticket+Modal+Here) | ![Theme & Bulk Actions](https://placehold.co/800x450/0f172a/64748b?text=Paste+Theme+%26+Bulk+Actions+Here) |

> 💡 **Instructions to update screenshots**: Replace the placeholder image URLs above with relative paths to your local images (e.g., `./public/dashboard.png`) or hosted image URLs.

---

## 🛠️ Tech Stack

### **Frontend & Framework**
- **Core Framework**: [Next.js 16.2.6](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Library**: [React 19.2.4](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **State Management**: [Zustand 5.0](https://zustand-demo.pmnd.rs/)
- **Data Table**: [@tanstack/react-table 9.1](https://tanstack.com/table/v9)

### **Styling & UI Components**
- **CSS Engine**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: Base UI / Shadcn UI primitives
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theme Management**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Utilities**: `clsx`, `tailwind-merge`, `tw-animate-css`

### **Database & Backend**
- **Database**: PostgreSQL (Hosted on Neon Serverless Postgres)
- **ORM**: [Prisma ORM 7.9](https://www.prisma.io/)
- **Driver Adapter**: `@prisma/adapter-pg` with `pg` connection pool
- **Validation**: [Zod 4](https://zod.dev/)

---

## 🏗️ High-Level Design (HLD)

### System Architecture

The following diagram represents the overall system architecture of Getic, showcasing the flow from user interactions in the client browser down to serverless API routes and the PostgreSQL datastore:

```mermaid
graph TD
    subgraph Client Layer ["Client Layer (Browser)"]
        UI["React 19 Components (App Router Pages)"]
        ZustandStore["Zustand State Store (lib/store.ts)"]
        ToastSys["Toast Notification Feedback"]
    end

    subgraph API Layer ["Next.js 16 Serverless API Routes"]
        TicketsAPI["/api/tickets (GET, POST, DELETE)"]
        TicketIdAPI["/api/tickets/[id] (PATCH, DELETE)"]
        TicketNotesAPI["/api/tickets/[id]/notes (GET, POST)"]
        GlobalNotesAPI["/api/notes (GET, POST)"]
    end

    subgraph Database Layer ["Data Layer"]
        PrismaClient["Prisma ORM Client (v7)"]
        DriverAdapter["@prisma/adapter-pg (pg Pool)"]
        NeonDB[("PostgreSQL Database (Neon Serverless)")]
    end

    UI <--> ZustandStore
    ZustandStore --> ToastSys
    ZustandStore <-->|HTTP JSON REST| API Layer
    API Layer <--> PrismaClient
    PrismaClient <--> DriverAdapter
    DriverAdapter <-->|TLS Connection| NeonDB
```

### End-to-End Data Flow

1. **User Action**: User performs an action in the browser (e.g., creates a ticket, updates ticket status, or posts an internal note).
2. **Optimistic Store Dispatch**: `useTicketStore` immediately updates the client-side state reactively and triggers a loading toast notification.
3. **API Invocation**: Store sends an asynchronous REST request (`POST`, `PATCH`, or `DELETE`) to the corresponding Next.js Route Handler.
4. **ORM Processing**: Route Handler invokes Prisma ORM 7, which routes SQL queries through `@prisma/adapter-pg` pooler to Neon PostgreSQL.
5. **Reconciliation**: On successful API response, the store syncs server-generated metadata (e.g., generated `ticketId`, database `createdAt` timestamps) and updates the toast to success. If an error occurs, state is rolled back and an error toast is displayed.

---

## 📐 Low-Level Design (LLD)

### Database Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    TICKET {
        Int id PK "Autoincrement primary key"
        String ticketId UK "Formatted Ticket Code (e.g. TKT-001)"
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
        Int ticketId FK "Foreign Key referencing TICKET(id)"
        String notesText "Content of internal note"
        DateTime createdAt "Timestamp of note entry"
    }

    TICKET ||--o{ NOTE : "has many (Cascade Delete)"
```

### Component Hierarchy & Module Breakdown

```text
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
├── main.tsx                  --> Main Dashboard container with filter controls & header stats
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

- **Request Headers**: `Content-Type: application/json`
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
{
  "ids": [1, 2, 3]
}
```

- **Response Body Example (200 OK)**:
```json
{
  "success": true
}
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
{
  "success": true
}
```

---

### 3. Ticket Notes Endpoint — `/api/tickets/[id]/notes`

#### `GET /api/tickets/[id]/notes`
Retrieves all internal notes tied to a specific ticket ID.

- **URL Params**: `id` (integer primary key)
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

- **URL Params**: `id` (integer primary key)
- **Request Body Example**:
```json
{
  "notesText": "Customer confirmed system is working properly now."
}
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

- **Query Parameters**: `ticketId` (optional)
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
{
  "ticketId": 1,
  "notesText": "Verified refund processed on payment portal."
}
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

---

## ⚡ Challenges Faced and Solved

### 1. Next.js 16 Dynamic Route Parameter Handling (`Promise<{ id: string }>`)
- **Challenge**: Next.js 16 introduced breaking API changes where dynamic route params in Route Handlers are passed as a `Promise` (`{ params }: { params: Promise<{ id: string }> }`). Attempting direct synchronous access (`params.id`) led to runtime errors and parameter resolution failures.
- **Solution**: Updated all route handlers (`app/api/tickets/[id]/route.ts` and `app/api/tickets/[id]/notes/route.ts`) to properly `await params` before accessing parameter values.

### 2. Formatted Auto-Increment Ticket Identifiers (`TKT-001`)
- **Challenge**: Standard SQL integer primary keys (1, 2, 3) lack visual domain clarity, while raw strings don't naturally sequence. The application required human-readable, auto-padded codes (`TKT-001`, `TKT-002`) with unique database constraints.
- **Solution**: Implemented a two-step transaction pattern in the ticket creation API route:
  1. Create the ticket record in PostgreSQL to obtain the autoincrement primary key `id`.
  2. Compute `ticketId = TKT-${String(id).padStart(3, '0')}` and update the record immediately before returning response data.

### 3. Database Connection Pooling with Prisma ORM 7 & PostgreSQL Driver Adapter
- **Challenge**: Prisma ORM 7 requires explicit driver adapter configuration when connecting to PostgreSQL serverless pools (like Neon), to prevent connection exhaustion during concurrent serverless API executions.
- **Solution**: Integrated `@prisma/adapter-pg` along with `pg.Pool` inside a global singleton initialization module (`lib/prisma.ts`), preserving hot-reloading efficiency in development while guaranteeing pooled connections in production.

### 4. Zero-Latency Optimistic State Synchronization & Fallback Rollbacks
- **Challenge**: Synchronous database network delays ruined user responsiveness during frequent operations like updating ticket statuses, deleting items, or adding notes.
- **Solution**: Designed the Zustand state store (`lib/store.ts`) with optimistic state updates. Actions immediately modify the local UI store state and emit loading toasts. If the underlying REST fetch succeeds, metadata is synchronized; if it fails, state changes are rolled back and error alerts are dispatched via the toast system.

### 5. Cascading Relational Deletes for Internal Notes
- **Challenge**: Deleting tickets that had associated internal notes threw foreign key violation exceptions (`PG::ForeignKeyViolation`) in PostgreSQL.
- **Solution**: Applied relational cascade deletion rules in `prisma/schema.prisma` (`ticket Ticket @relation(..., onDelete: Cascade)`). Deleting a ticket automatically cleans up associated note records in PostgreSQL without orphan data.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or higher
- **Package Manager**: `pnpm`, `npm`, or `yarn`
- **Database**: PostgreSQL connection URI

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/greyart93/getic.git
   cd getic
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/getic_db?sslmode=require"
   ```

4. **Run Database Migrations & Prisma Generation**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **(Optional) Seed Initial Data**
   ```bash
   npx prisma db seed
   ```

6. **Start Development Server**
   ```bash
   pnpm dev
   ```

7. **Open Application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
