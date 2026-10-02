// One-off smoke test for the Nodemailer/SMTP pipeline:
//   pnpm email:test you@company.com
// Renders the ticket-created react-email template and sends it through the
// SAME transport lib/email.tsx uses (SMTP_HOST/PORT/USER/PASS/SECURE env).
// Without SMTP_HOST the sender logs instead - run with SMTP set for a real
// delivery check. Exit code 0 = send accepted by the SMTP server.

import "dotenv/config"
import { sendTicketCreatedEmail } from "../lib/email"

const to = process.argv[2] || process.env.FIRST_ADMIN_EMAIL
if (!to) {
  console.error("No recipient: set FIRST_ADMIN_EMAIL or pass an address as argv[2]")
  process.exit(1)
}

console.log(`[email:test] sending ticket-created template to ${to} ...`)
await sendTicketCreatedEmail({
  to,
  customerName: "Smoke Test",
  ticketId: "TKT-TEST",
  subject: "SMTP pipeline test (Nodemailer)",
})
console.log(`[email:test] done - no exception. If SMTP_HOST is unset the mail was logged to the lib/email sender's console output instead of sent.`)
