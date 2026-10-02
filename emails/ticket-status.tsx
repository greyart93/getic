//
// ─── EMAIL: TICKET STATUS CHANGED ──────────────────────────────────────────
// Sent to the CUSTOMER when PATCH /api/tickets/[id] changes the status
// (no-op updates — same status as before — send nothing; enforced in the route).

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type TicketStatusEmailProps = {
    customerName: string;
    ticketId: string;
    subject: string;
    /** The new Status enum value: OPEN | IN_PROGRESS | CLOSED. */
    newStatus: string;
};

// 👇 One place maps enum → human words (also reused for the subject line).
export const statusLabel = (status: string) =>
    status === "OPEN" ? "re-opened" : status === "IN_PROGRESS" ? "now in progress" : "closed (resolved)";

export const ticketStatusSubject = ({ ticketId, newStatus }: TicketStatusEmailProps) =>
    `[Getic] Ticket ${ticketId} is ${statusLabel(newStatus)}`;

export default function TicketStatusEmail({ customerName, ticketId, subject, newStatus }: TicketStatusEmailProps) {
    const friendly = statusLabel(newStatus);
    return (
        <BrandLayout
            previewText={`Your ticket ${ticketId} — "${subject}" — is ${friendly}.`}
            heading={`Update on ${ticketId}`}
        >
            <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Hi {customerName}, your ticket <b>{subject}</b> is now <b>{friendly}</b>.
            </Text>
        </BrandLayout>
    );
}
