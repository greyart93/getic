"use client"

import React from "react" 
import { createColumnHelper } from "@tanstack/react-table"
import type { Ticket } from "./tempdata.js";
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Eye, StickyNote } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type DataTableFeatures } from "./data-table-features";
import { formatDate } from "@/lib/datetime";//
// ─── TABLE COLUMN DEFINITIONS ────────────────────────────────────────────
// Describes the 6 columns of the tickets table: ID, Subject, Customer,
// Status, Date, Actions. TanStack Table v9 renders whatever these cells
// return, so each `cell` is a mini React component.
//
// HOW ACTIONS REACH THE OUTSIDE WORLD: cells can't call the zustand store
// directly (columns are defined once, outside React). Instead data-table.tsx
// passes callbacks through table `meta` (see its useTable call) and each cell
// pulls them out via `table.options.meta`. Status change, view, edit, note
// and delete all follow that same indirection.

// 👇 Define the shape of our custom meta locally
type TableMetaWithHandler = {
  onStatusChange?: (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => void
  onDeleteTicket?: (id: number) => void   // 👈 Add this
  onEditTicket?: (ticket: Ticket) => void // 👈 Add this
  onViewTicket?: (ticket: Ticket) => void
  onAddNoteTicket?: (ticket: Ticket) => void
}

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>()

// Reusable header: clicking toggles asc -> desc sorting (the three icons
// show unsorted / asc / desc state).
const SortableHeader = ({ column, title }: { column: any, title: string }) => {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
};

export const columns = columnHelper.columns([
  columnHelper.accessor("ticketId", {
    header: ({ column }) => <SortableHeader column={column} title="ID" />,
  }),
  
  columnHelper.accessor("subject", {
    header: ({ column }) => <SortableHeader column={column} title="Subject" />,
  }),
  
  columnHelper.accessor("customerName", {
    header: ({ column }) => <SortableHeader column={column} title="Customer" />,
    cell: ({ getValue }) => {
      const val = getValue()
      return (
        <div className="flex items-center gap-1">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>{val}</AvatarFallback>
          </Avatar>
          <p>{val}</p>
        </div>
      )
    }
  }),
  
  columnHelper.accessor("status", {
    header: ({ column }) => (
      <div className="flex justify-center">
        <SortableHeader column={column} title="Status" />
      </div>
    ),
    cell: ({ row, getValue, table }) => {
      const currentStatus = getValue();

      // 👇 Badge color per status; destructive (red) is the fallback for CLOSED
      const getBadgeVariant = (status: string) => {
        if (status === "OPEN") return "default";
        if (status === "IN PROGRESS" || status === "IN_PROGRESS") return "green";
        return "destructive";
      }

      const handleStatusChange = (newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => {
        // 👇 Safely cast the meta to our type and call the function
        const meta = table.options.meta as TableMetaWithHandler;
        if (meta?.onStatusChange) {
          meta.onStatusChange(row.original.id, newStatus);
        }
      }

      return (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer outline-none">
              <Badge variant={getBadgeVariant(currentStatus)}>
                {currentStatus === 'IN_PROGRESS' ? 'IN PROGRESS' : currentStatus}
              </Badge>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => handleStatusChange("OPEN")}>
                <Badge variant="default" className="mr-2 h-2 w-2 rounded-full p-0" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("IN PROGRESS")}>
                <Badge className="mr-2 h-2 w-2 rounded-full p-0 bg-green-600" />
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("CLOSED")}>
                <Badge className="mr-2 h-2 w-2 rounded-full p-0 bg-red-500" />
                Closed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  }),
  
  // 👇 DATE column: sorts on the RAW value (ISO strings sort chronologically —
  //    a happy accident of the format) but DISPLAYS the formatted local date.
  //    `createdAt ?? date` covers rows from the API (createdAt) and the legacy
  //    mock rows (date).
  columnHelper.accessor((row) => row.createdAt ?? row.date, {
    id: "date",
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
    // 👇 Client-side formatting — the viewer's timezone (lib/datetime.ts)
    cell: ({ getValue }) => formatDate(getValue()),
  }),
  // 👇 ACTIONS column: not sortable/filterable — `display` columns have no
  //    accessor at all, they're purely visual.
  columnHelper.display({
    id: "actions",
    cell: ({ row, table }) => {
      const ticket = row.original;

      const handleView = () => {
        const meta = table.options.meta as TableMetaWithHandler;
        if (meta?.onViewTicket) {
          meta.onViewTicket(ticket);
        }
      };

      const handleAddNote = () => {
        const meta = table.options.meta as TableMetaWithHandler;
        if (meta?.onAddNoteTicket) {
          meta.onAddNoteTicket(ticket);
        }
      };

      const handleDelete = () => {
        const meta = table.options.meta as TableMetaWithHandler;
        if (meta?.onDeleteTicket) {
          meta.onDeleteTicket(ticket.id);
        }
      };

      const handleEdit = () => {
        const meta = table.options.meta as TableMetaWithHandler;
        if (meta?.onEditTicket) {
          meta.onEditTicket(ticket);
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none h-8 w-8 p-0 cursor-pointer">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleView}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddNote}>
              <StickyNote className="mr-2 h-4 w-4" />
              Add Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  }),
])


// Custom global filter fn (registered in data-table-features.ts). Currently
// the search box in main.tsx filters the data array BEFORE it reaches the
// table, so this is only used if you wire table.getColumn('...').setFilterValue.
export const globalSearchFilter = (row: any, columnId: string, filterValue: string) => {
  const searchValue = filterValue.toLowerCase()
  
  // Define which columns to search
  const searchableColumns = ['ticketId', 'subject', 'customerName']
  
  // Check if ANY of those columns match the search
  return searchableColumns.some(colId => {
    const value = row.getValue(colId)
    return String(value).toLowerCase().includes(searchValue)
  })
}