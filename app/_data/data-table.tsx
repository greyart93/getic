"use client"
import * as React from "react"

import { 
  useTable, 
  type ColumnDef, 
  type RowData, 
  type SortingState,
  type ColumnFiltersState
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

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  filterStatus?: string
  onStatusChange?: (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => void
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  filterStatus = "all",
  onStatusChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

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

  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    // 👇 Pass meta here - we add a custom 'id' to satisfy TypeScript
    meta: {
      onStatusChange,
    } as any, 
    initialState: {
      pagination: {
        pageSize: 5,
        pageIndex: 0
      }
    },
  })

  return (
    <div className="h-[60vh] flex flex-col overflow-auto rounded-md border relative">
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
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