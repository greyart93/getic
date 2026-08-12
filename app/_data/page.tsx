import { columns } from "./columns"
import type { Ticket } from "./tempdata"
import { tickets } from "./tempdata"
import { DataTable } from "./data-table"

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