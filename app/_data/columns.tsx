"use client"

import React from "react" 
import { createColumnHelper } from "@tanstack/react-table"
import type { Ticket } from "./tempdata.js";
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type DataTableFeatures } from "./data-table-features";


// 👇 Define the shape of our custom meta locally
type TableMetaWithHandler = {
  onStatusChange?: (id: number, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => void
   onDeleteTicket?: (id: number) => void   // 👈 Add this
  onEditTicket?: (ticket: Ticket) => void // 👈 Add this
}

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>()

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
  columnHelper.accessor("ticket_id", {
    header: ({ column }) => <SortableHeader column={column} title="ID" />,
  }),
  
  columnHelper.accessor("subject", {
    header: ({ column }) => <SortableHeader column={column} title="Subject" />,
  }),
  
  columnHelper.accessor("customer_name", {
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
    header: ({ column }) => <SortableHeader column={column} title="Status" />,
    cell: ({ row, getValue, table }) => {
      const currentStatus = getValue();

      const getBadgeVariant = (status: string) => {
        if (status === "OPEN") return "default";
        if (status === "IN PROGRESS") return "green";
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer">
              <Badge variant={getBadgeVariant(currentStatus)}>
                {currentStatus}
              </Badge>
            </div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleStatusChange("OPEN")}>
              <Badge variant="default" className="mr-2 h-2 w-2 rounded-full p-0" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("IN PROGRESS")}>
              <Badge  className="mr-2 h-2 w-2 rounded-full p-0 bg-green-600" />
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("CLOSED")}>
              <Badge  className="mr-2 h-2 w-2 rounded-full p-0 bg-red-500" />
              Closed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }),
  
  columnHelper.accessor("date", {
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row, table }) => {
      const ticket = row.original;

      // Access the delete function from table meta
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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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


// Add this at the very bottom of columns.tsx, after the columns array
export const globalSearchFilter = (row: any, columnId: string, filterValue: string) => {
  const searchValue = filterValue.toLowerCase()
  
  // Define which columns to search
  const searchableColumns = ['ticket_id', 'subject', 'customer_name']
  
  // Check if ANY of those columns match the search
  return searchableColumns.some(colId => {
    const value = row.getValue(colId)
    return String(value).toLowerCase().includes(searchValue)
  })
}