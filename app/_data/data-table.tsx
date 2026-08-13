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
  onBulkDelete?: (ids: number[]) => void
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  filterStatus = "all",
  onStatusChange,
  globalSearch = "", 
  onDeleteTicket,   
  onEditTicket,
  onBulkDelete,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Handle Tab filtering
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

  const filteredData = React.useMemo(() => {
    let result = data
    const statusFilter = columnFilters.find(f => f.id === 'status')
    if (statusFilter) {
      result = result.filter((item: any) => item.status === statusFilter.value)
    }
    if (globalSearch.trim() !== "") {
      const searchLower = globalSearch.toLowerCase()
      result = result.filter((item: any) => {
        return (
          String(item.ticket_id).toLowerCase().includes(searchLower) ||
          String(item.subject).toLowerCase().includes(searchLower) ||
          String(item.customer_name).toLowerCase().includes(searchLower)
        )
      })
    }
    return result
  }, [data, columnFilters, globalSearch])

  // 👇 DEFINE THE CHECKBOX COLUMN
  const checkboxColumn = {
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
  } as ColumnDef<DataTableFeatures, any>

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
    // 👇 CRITICAL FIX: Tell the table how to get a unique ID for each row
    getRowId: (row: any) => String(row.id),
    meta: {
      onStatusChange,
      onDeleteTicket,
      onEditTicket
    } as any,
    initialState: {
      pagination: {
        pageSize: 5,
        pageIndex: 0
      }
    },
  })

  // 👇 FIX: Get selected IDs safely using getRowId
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

  // 👇 FIXED HANDLE BULK DELETE (No native confirm)
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    
    // ❌ REMOVED: if (confirm(...)) { ... }
    
    if (onBulkDelete) {
      onBulkDelete(selectedIds) // 👈 Open the Shadcn Dialog in main.tsx
      setRowSelection({}) // Clear selection after deletion
    }
  }

  return (
    <div className="h-[60vh] flex flex-col overflow-auto rounded-md border relative">
      
      {/* 👇 BULK ACTION TOOLBAR */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 bg-gray-200 dark:bg-[#0f0f11] p-2 border-b flex justify-between items-center">
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

      <div className="flex-1">
        <Table>
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
      <div className="sticky bottom-0 z-10 p-0.5 bg-gray-200 dark:bg-[#0f0f11] border-t">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}