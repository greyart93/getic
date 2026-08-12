import { columns } from "@/app/_data/columns"
import type { Ticket } from "@/app/_data/tempdata"
import { tickets } from "@/app/_data/tempdata"
import { DataTable } from "@/app/_data/data-table"

async function getData(): Promise<Ticket[]> {
  // Fetch data from your API here.
  return tickets
}

export default async function DemoPage() {
  const data = await getData()

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  )
}