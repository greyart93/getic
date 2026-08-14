"use client"

import { useMemo, useEffect, useState } from "react"
import { useTicketStore } from "@/lib/store"
import LayoutClient from "@/components/layout"
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList,
    LineChart, Line
} from "recharts"

function Card({ title, num }: { title: string, num: number }) {
    return (
        <div className="p-4 border rounded-xl flex-1 min-w-[120px] bg-card text-card-foreground shadow-xs flex flex-col justify-between">
            <p className="text-xs md:text-sm text-muted-foreground font-medium pb-2">{title}</p>
            <h5 className="text-2xl md:text-3xl font-bold">{num}</h5>
        </div>
    )
}

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'];
const STATUS_COLORS = {
    'OPEN': '#ef4444',
    'IN PROGRESS': '#22c55e',
    'CLOSED': '#64748b'
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card text-card-foreground p-3 border rounded-lg shadow-md text-sm">
                {label && <p className="font-semibold mb-1">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color || entry.fill }}>
                        {entry.name}: <span className="font-medium">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const { tickets, fetchTickets, isLoading } = useTicketStore()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        fetchTickets()
    }, [])

    const { cardData, statusData, customerData, timelineData } = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'OPEN').length;
        const inProgress = tickets.filter(t => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS').length;
        const closed = tickets.filter(t => t.status === 'CLOSED').length;

        const cardData = [
            { title: "Total Tickets", num: total },
            { title: "Open", num: open },
            { title: 'In Progress', num: inProgress },
            { title: 'Closed', num: closed }
        ];

        const statusData = [
            { name: 'Open', value: open, color: STATUS_COLORS['OPEN'] },
            { name: 'In Progress', value: inProgress, color: STATUS_COLORS['IN PROGRESS'] },
            { name: 'Closed', value: closed, color: STATUS_COLORS['CLOSED'] }
        ].filter(d => d.value > 0);

        // Group by Customer
        const customerMap: Record<string, number> = {};
        tickets.forEach(t => {
            const name = t.customerName || "Unknown";
            customerMap[name] = (customerMap[name] || 0) + 1;
        });
        const customerData = Object.entries(customerMap)
            .map(([name, count]) => ({ name, tickets: count }))
            .sort((a, b) => b.tickets - a.tickets)
            .slice(0, 5); // Top 5

        // Group by Date for Timeline
        const dateMap: Record<string, number> = {};
        tickets.forEach(t => {
            let d = t.createdAt || t.date || "Unknown";
            if (d.includes(",")) d = d.split(",")[0];
            dateMap[d] = (dateMap[d] || 0) + 1;
        });
        const timelineData = Object.entries(dateMap)
            .map(([date, count]) => ({ date, count }))
            .slice(-7); // Last 7 unique dates

        return { cardData, statusData, customerData, timelineData };
    }, [tickets]);

    if (!isClient) return null; // Avoid hydration mismatch on charts

    return (
        <LayoutClient>
            <main className="pb-8">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Overview of your ticket statistics and team performance.</p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 border rounded-xl flex-1 animate-pulse bg-muted/20">
                                <div className="h-4 w-16 bg-muted-foreground/20 rounded mb-4"></div>
                                <div className="h-8 w-12 bg-muted-foreground/20 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {cardData.map((v, i) => (
                                <Card key={i} title={v.title} num={v.num} />
                            ))}
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Status Distribution */}
                            <div className="border rounded-xl p-4 bg-card shadow-xs flex flex-col">
                                <h3 className="font-semibold mb-6">Status Distribution</h3>
                                <div className="flex-1 min-h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                                                    if (midAngle === undefined || cx === undefined || cy === undefined) return null;
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = 25 + innerRadius + (outerRadius - innerRadius);
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    return (
                                                        <text x={x} y={y} fill={statusData[index].color} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600}>
                                                            {value}
                                                        </text>
                                                    );
                                                }}
                                                labelLine={false}
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Customers */}
                            <div className="border rounded-xl p-4 bg-card shadow-xs flex flex-col lg:col-span-2">
                                <h3 className="font-semibold mb-6">Tickets by Customer</h3>
                                <div className="flex-1 min-h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={customerData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.6 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.6 }}
                                                allowDecimals={false}
                                            />
                                            <RechartsTooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} content={<CustomTooltip />} />
                                            <Bar dataKey="tickets" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                                <LabelList dataKey="tickets" position="top" fill="currentColor" opacity={0.8} fontSize={12} fontWeight={600} />
                                                {customerData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Timeline / Activity */}
                            <div className="border rounded-xl p-4 bg-card shadow-xs flex flex-col lg:col-span-3">
                                <h3 className="font-semibold mb-6">Recent Activity (Tickets Created)</h3>
                                <div className="flex-1 min-h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.6 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.6 }}
                                                allowDecimals={false}
                                            />
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="count"
                                                stroke="#3b82f6"
                                                strokeWidth={3}
                                                dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                                                activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6" }}
                                            >
                                                <LabelList dataKey="count" position="top" fill="currentColor" opacity={0.8} fontSize={12} offset={10} fontWeight={600} />
                                            </Line>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </LayoutClient>
    )
}
