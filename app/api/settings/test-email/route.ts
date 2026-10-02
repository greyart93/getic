//
// ─── SETTINGS: TEST EMAIL ──────────────────────────────────────────────────
//   POST /api/settings/test-email → { sent: boolean, recipient: string }
//
// Sends ONE real email (a genuine react-email template, not a stub) to the
// signed-in user — the "Send test email" button in Settings uses this to
// prove the whole chain (template render → Resend SDK → provider) works.
//
// `sent` distinguishes the two honest outcomes:
//   true  → handed to Resend with a configured API key
//   false → no RESEND_API_KEY; the sender logged it to the server console
//
// AUTH: any signed-in user (they can only email THEMSELVES — the recipient
// comes from the session, never the request body).

import { requireUser } from "@/lib/rbac"
import { sendTicketCreatedEmail } from "@/lib/email"

export async function POST() {
    const gate = await requireUser()
    if (!gate.ok) return gate.response

    const { user } = gate.session

    // 👇 Reuses the ticket-confirmation template with clearly-test copy so
    //    the button exercises exactly what production sends.
    const sent = await sendTicketCreatedEmail({
        to: user.email,
        customerName: user.name || user.email,
        ticketId: "TKT-TEST",
        subject: "Resend test from Settings",
    })

    return Response.json({ sent, recipient: user.email })
}
