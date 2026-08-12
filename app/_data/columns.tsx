"use client"

import { createColumnHelper } from "@tanstack/react-table"
import type { Ticket } from "./tempdata.js";    
import { Badge } from "@/components/ui/badge"
import { type DataTableFeatures } from "./data-table-features.js"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
// export type Payment = {
//   id: string
//   amount: number
//   status: "pending" | "processing" | "success" | "failed"
//   email: string
// }



// Use `accessor` for data columns and `display` for columns without one.
const columnHelper = createColumnHelper<DataTableFeatures, Ticket>()

export const columns = columnHelper.columns([
  columnHelper.accessor("ticket_id", {
    header: "ID",
  }),
  columnHelper.accessor("subject", {
    header: "Subject",
  }),
  columnHelper.accessor("customer_name", {
    header: "Customer",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({getValue}) => {
      const status = getValue()
          let variant: "default" | "destructive" | "outline" | "secondary" = "default";
    if (status === "OPEN") variant = "default";
    else if (status === "IN PROGRESS") variant = "secondary"; // Gray-ish
    else if (status === "CLOSED") variant = "destructive";    // Red-ish

    return <Badge variant={variant}>{status}</Badge>
    }
  }),
  columnHelper.accessor("date", {
    header: "Date",
  }),
  
])