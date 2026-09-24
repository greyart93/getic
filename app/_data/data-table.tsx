//
// ─── THE DATA TABLE (TanStack Table v9 + shadcn Table primitives) ───────
// Headless table: TanStack computes rows/sorting/selection, the shadcn
// <Table> components are pure HTML rendering. Data flow in:
//   main.tsx (zustand tickets + search text + active tab)
//     └─ DataTable: applies status filter + global search ITSELF (plain JS,
//        see filteredData below), then hands the result to useTable for
//        sorting/pagination/selection.
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
  filterStatus?: string
  onStatusChange?: (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => void
  globalSearch?: string 
  onDeleteTicket?: (id: number) => void
  onEditTicket?: (ticket: TData) => void
  onViewTicket?: (ticket: TData) => void
  onAddNoteTicket?: (ticket: TData) => void
  onBulkDelete?: (ids: number[]) => void
  // 👇 NEW PROP FOR STATS
  headerStats?: {
    total: number
    open: number
    inProgress: number
    closed: number
  }

}

export function DataTable<TData extends RowData>({
  columns,
  data,
  filterStatus = "all",
  onStatusChange,
  globalSearch = "", 
  onDeleteTicket,   
  onEditTicket,
  onViewTicket,
  onAddNoteTicket,
  onBulkDelete,
  headerStats,

}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // ── TAB FILTERING ──
  // When the user clicks a tab (All / Open / In Progress / Closed) in main.tsx,
  // this effect translates it into a TanStack columnFilter on the `status`
  // column. Sorting is reset too — otherwise a sorted view could hide rows.
  React.useEffect(() => {
    setSorting([])
    if (filterStatus === "all") {
      setColumnFilters([])
    } else {
      const statusMap: Record<string, string> = {
        "open": "OPEN",
        "in_progress": "IN PROGRESS",
        "closed": "CLOSED"
      }
      setColumnFilters([{ id: 'status', value: statusMap[filterStatus] }])
    }
  }, [filterStatus])

  // ── MANUAL FILTERING (pre-TanStack) ──
  // Status + global search are applied to the raw array BEFORE useTable sees
  // it. (Search matches ticketId, subject and customerName only.) Note the
  // IN PROGRESS / IN_PROGRESS compatibility check — the DB enum uses the
  // underscore, the UI uses the space. This could instead use TanStack's
  // filterFns; it predates the v9 migration.
  const filteredData = React.useMemo(() => {
    let result = data
    const statusFilter = columnFilters.find(f => f.id === 'status')
    if (statusFilter) {
      result = result.filter((item: any) => item.status === statusFilter.value || (statusFilter.value === "IN PROGRESS" && item.status === "IN_PROGRESS"))
    }
    if (globalSearch.trim() !== "") {
      const searchLower = globalSearch.toLowerCase()
      result = result.filter((item: any) => {
        return (
          String(item.ticketId || item.ticket_id || "").toLowerCase().includes(searchLower) ||
          String(item.subject || "").toLowerCase().includes(searchLower) ||
          String(item.customerName || item.customer_name || "").toLowerCase().includes(searchLower)
        )
      })
    }
    return result
  }, [data, columnFilters, globalSearch])

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
  // `state` is CONTROLLED: sorting/selection live in React state above so
  // other code can read them. Everything else (pagination) is uncontrolled
  // via initialState.
  const table = useTable({
    features,
    data: filteredData,
    columns: [checkboxColumn, ...columns],
    state: {
      sorting,
      rowSelection,
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
  // it back to the numeric DB ids the bulk-delete API expects.
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
                    <TableHead key={header.id}>
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