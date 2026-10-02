//
// ─── THE DATA TABLE (TanStack Table v9 + shadcn Table primitives) ───────
// Headless table: TanStack computes rows/sorting/selection/pagination, the
// shadcn <Table> components are pure HTML rendering. Data flow in:
//   main.tsx (zustand tickets — the FULL table — + toolbar filter state)
//     └─ DataTable: applies status filter + search ITSELF (plain JS, see
//        filteredData below), then hands the result to useTable, which does
//        sorting/pagination CLIENT-SIDE (instant — data is already local).
// Actions flow out via `meta` callbacks -> main.tsx -> zustand store.

"use client"
import * as React from "react"

import { 
  useTable, 
  type ColumnDef, 
  type RowData, 
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState 
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { features, type DataTableFeatures } from "./data-table-features"
import { DataTablePagination } from "./pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  // ── TOOLBAR FILTER PROPS (shadcn Tasks pattern, state owned by main.tsx) ──
  search?: string // global text: matches ticketId/subject/customer
  statusFilter?: string[] // multi-select DB enum values; [] = no filter
  columnVisibility?: Record<string, boolean> // View menu state (controlled)
  onColumnVisibilityChange?: (v: Record<string, boolean>) => void
  onStatusChange?: (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => void
  onDeleteTicket?: (id: number) => void
  onEditTicket?: (ticket: TData) => void
  onViewTicket?: (ticket: TData) => void
  onAddNoteTicket?: (ticket: TData) => void
  onBulkDelete?: (ids: number[]) => void
}

// ── COLUMN WIDTH CONTRACT (works with table-fixed in ui/table.tsx) ──
// In a fixed-layout table the FIRST row of <th>s decides every column's
// width. Pinning the narrow columns leaves Subject (no entry) to absorb the
// remaining space — its cell content truncates, so it can flex safely.
// Widths are min-w-style floors: at mobile the table just overflows its
// scroll container horizontally instead of crushing columns.
const HEAD_WIDTHS: Record<string, string> = {
  select: "w-[44px]",
  ticketId: "w-[110px]",
  customerName: "w-[150px]",
  status: "w-[130px]",
  date: "w-[115px]",
  actions: "w-[56px]",
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  search = "",
  statusFilter = [],
  columnVisibility = {},
  onColumnVisibilityChange,
  onStatusChange,
  onDeleteTicket,   
  onEditTicket,
  onViewTicket,
  onAddNoteTicket,
  onBulkDelete,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // ── MANUAL FILTERING (pre-TanStack) ──
  // Status (multi-select) + global search are applied to the raw array BEFORE
  // useTable sees it. Search matches ticketId, subject and customerName only.
  // Status matching covers both spellings — the DB enum uses the underscore
  // (IN_PROGRESS), the UI passes the same enum value, legacy rows may not.
  // Could instead use TanStack filterFns; this predates the v9 migration.
  const filteredData = React.useMemo(() => {
    let result = data
    if (statusFilter.length > 0) {
      result = result.filter((item: any) =>
        statusFilter.includes(item.status) ||
        (item.status === "IN_PROGRESS" && statusFilter.includes("IN PROGRESS")) ||
        (item.status === "IN PROGRESS" && statusFilter.includes("IN_PROGRESS"))
      )
    }
    if (search.trim() !== "") {
      const searchLower = search.toLowerCase()
      result = result.filter((item: any) => {
        return (
          String(item.ticketId || item.ticket_id || "").toLowerCase().includes(searchLower) ||
          String(item.subject || "").toLowerCase().includes(searchLower) ||
          String(item.customerName || item.customer_name || "").toLowerCase().includes(searchLower)
        )
      })
    }
    return result
  }, [data, statusFilter, search])

  // ── CHECKBOX COLUMN (row selection) ──
  // Prepended to the user columns below. The header checkbox selects ALL rows
  // (toggleAllRowsSelected), each row checkbox toggles one. This is what
  // feeds the bulk-delete toolbar.
  const checkboxColumn: ColumnDef<DataTableFeatures, TData> = {
    id: "select",
    header: ({ table }: any) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: any) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
  // ── THE TABLE INSTANCE ──
  // `state` is CONTROLLED: sorting/selection/columnVisibility live in React
  // state above. PAGINATION is UNCONTROLLED — TanStack slices the full local
  // array itself (client-side, instant; see initialState below).
  const table = useTable({
    features,
    data: filteredData,
    columns: [checkboxColumn, ...columns],
    state: {
      sorting,
      rowSelection,
      // 👇 Controlled column visibility: the View menu in the toolbar owns it.
      columnVisibility,
    },
    onColumnVisibilityChange: (updater) => {
      if (!onColumnVisibilityChange) return
      const next = typeof updater === "function" ? updater(columnVisibility) : updater
      onColumnVisibilityChange(next)
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    // 👇 CRITICAL for row selection: without a stable row id TanStack falls
    //    back to row INDEX, and selection breaks when pages change/sort.
    //    We map each row to its DB primary key.
    getRowId: (row: any) => String(row.id),
    meta: {
      onStatusChange,
      onDeleteTicket,
      onEditTicket,
      onViewTicket,
      onAddNoteTicket,
    } as any,
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0
      }
    },
  })

  // ── SELECTED ROW IDS ──
  // rowSelection is a { "rowId": true } map, not an array — this memo converts
  // it back to the numeric DB ids the bulk-delete API expects. Selection is
  // per-page by design: rows vanish from the map when their page leaves, so a
  // bulk delete can only ever target what the user currently sees.
  const selectedIds = React.useMemo(() => {
    const ids: number[] = []
    table.getSelectedRowModel().rows.forEach((row) => {
      const original = row.original as any
      if (original?.id) {
        ids.push(original.id)
      }
    })
    return ids
  }, [rowSelection, table])

  // ── BULK DELETE HANDLER ──
  // Deliberately does NOT call window.confirm (blocked by some browsers in
  // iframes, ugly, not styleable) — instead onBulkDelete opens the styled
  // confirmation dialog owned by main.tsx.
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return

    if (onBulkDelete) {
      onBulkDelete(selectedIds) // 👈 Open the Shadcn Dialog in main.tsx
      setRowSelection({}) // Clear selection after deletion
    }
  }

  return (
    <div className="h-[75vh] flex flex-col rounded-md border relative overflow-hidden">
      
      {/* ── BULK ACTION TOOLBAR: appears only when rows are selected ── */}
      {selectedIds.length > 0 && (
        <div className="bg-gray-200 dark:bg-[#0f0f11] p-2 border-b flex justify-between items-center z-20">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} row(s) selected
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleBulkDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <Table>
          {/* Sticky header stays visible while the body scrolls (h-[75vh]) */}
          <TableHeader className="sticky top-0 z-10 bg-gray-200 dark:bg-[#0f0f11]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    // 👇 WIDTH CONTRACT: with table-fixed (see ui/table.tsx),
                    //    the FIRST row of <th>s assigns every column its
                    //    width for the entire table. Pinned widths for narrow
                    //    columns; Subject has none → absorbs the remainder.
                    //    Sorting/filtering changes row ORDER only — column
                    //    positions can no longer shift.
                    <TableHead
                      key={header.id}
                      className={HEAD_WIDTHS[header.column.id] ?? ""}
                    >
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-0.5 bg-gray-200 dark:bg-[#0f0f11] border-t z-10 w-full">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}