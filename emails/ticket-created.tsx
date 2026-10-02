//
// ─── EMAIL: TICKET CREATED ─────────────────────────────────────────────────
// Sent to the CUSTOMER (not the agent) right after POST /api/tickets commits.

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type TicketCreatedEmailProps = {
    customerName: string;
    ticketId: string;
    subject: string;
};

export const ticketCreatedSubject = ({ ticketId, subject }: TicketCreatedEmailProps) =>
    `[Getic] Ticket ${ticketId} received — ${subject}`;

export default function TicketCreatedEmail({ customerName, ticketId, subject }: TicketCreatedEmailProps) {
    return (
        <BrandLayout
            previewText={`We received your support request "${subject}" — ticket ${ticketId}.`}
            heading={`Thanks, ${customerName}! We got your ticket.`}
        >
            <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Your support request <b>{subject}</b> was logged as <b>{ticketId}</b>. Our team will pick it up shortly —
                you&apos;ll get an email whenever its status changes.
            </Text>
        </BrandLayout>
    );
}
