import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DemoPage from "./data-table"

const CardInfo = [
    {
        title: "Total Tickets",
        num: 13,
    },
    {
        title: "Open",
        num: 4
    },
    {
        title: 'In Progress',
        num: 2
    },
    {
        title: 'Closed',
        num: 7
    }

]

export default function Main() {
    return (
        <main>
            {/* Summary Cards */}
            <div className="flex gap-3">
                {CardInfo.map((v, i) => (
                    <Card key={i} title={v.title} num={v.num} />
                ))}
            </div>

            {/* Tabs */}
            <div className="mt-10">
                <Tabs defaultValue="all">
                    <TabsList variant={"pill"} className='py-5 px-1.5'>
                        <TabsTrigger value="all" className='p-4'>All</TabsTrigger>
                        <TabsTrigger value="open" className='p-4'>Open</TabsTrigger>
                        <TabsTrigger value="in_progress" className='p-4'>In Progress</TabsTrigger>
                        <TabsTrigger value="closed" className='p-4'>Closed</TabsTrigger>


                    </TabsList>
                    <TabsContent value="all">All Tickets here.</TabsContent>
                    <TabsContent value="open">Open Tickets here.</TabsContent>
                    <TabsContent value="in_progress">IN Progress here.</TabsContent>
                    <TabsContent value="closed">Closed tickets.</TabsContent>

                </Tabs>
            </div>
            <DemoPage />

        </main>
    )
}


function Card({ title, num }: { title: string, num: number }) {
    return (
        <div className="p-2 md:p-3 border rounded-xl flex-1">
            <p className="text-[10px] md:text-[13px] font-light pb-4">{title}</p>
            <h5 className="p-1 text-xl md:text-2xl">{num}</h5>
        </div>
    )
}