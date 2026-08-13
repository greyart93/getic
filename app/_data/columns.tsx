"use client"

import React from "react" 
import { createColumnHelper } from "@tanstack/react-table"
import type { Ticket } from "./tempdata.js";
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
])