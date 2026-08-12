export type Ticket = {
    id: number
    ticket_id: string
    customer_name: string
    customer_email: string
    subject: string
    description: string
    status: 'OPEN' | 'IN PROGRESS' |'CLOSED'
    date: string
}

export type Note = {
    id: number
    ticket_id: number
    notes_text: string
}


export const tickets: Ticket[] = [
    {
        id: 1,
        ticket_id: 'TKT-001',
        customer_name: 'art',
        customer_email: 'art@gmail.com',
        subject: "UI bug",
        description: "bg-color is outside of the border",
        status: 'IN PROGRESS',
        date: '07/Nov/2026'
    },
    {
        id: 2,
        ticket_id: 'TKT-002',
        customer_name: 'art',
        customer_email: 'art@gmail.com',
        subject: "form bug",
        description: "form is not submitting",
        status: 'OPEN',
        date: '02/Feb/2020'
    },{
        id: 3,
        ticket_id: 'TKT-003',
        customer_name: 'art',
        customer_email: 'art@gmail.com',
        subject: "frontend issue",
        description: "front-end text is small",
        status: 'CLOSED',
        date: '25/Dec/2025'

    },{
        id: 4,
        ticket_id: 'TKT-004',
        customer_name: 'bob',
        customer_email: 'bob@gmail.com',
        subject: "Server error",
        description: "SSR out of control",
        status: 'IN PROGRESS',
        date: '23/Apr/2022'

    },
]

