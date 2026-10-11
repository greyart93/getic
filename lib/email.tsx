//
// ─── EMAIL SENDER (RESEND HTTPS → SMTP → console) ───────────────────
// The single send path for ALL app email:
//   - Better Auth hooks (OTP verification / password reset) — lib/auth.ts
//   - App notifications (ticket created / status changed) — ticket API routes
//   - Product mail (welcome on first sign-in, org invites) — misc routes
//
// TEMPLATES: React components in `emails/` (react-email v6), rendered to HTML
// with `render()`. Preview them live: `pnpm email:dev`.
//
// RAILS:
//   1. RESEND_API_KEY → Resend HTTPS API (recommended on Vercel: raw
//      outbound SMTP is blocked on serverless, so SMTP creds alone fail
//      silently there). Plain fetch — no SDK dependency.
//   2. SMTP_*         → Nodemailer/SMTP (dev, self-host, Gmail App Password,
//      Brevo, Mailgun, SES, Ethereal… no vendor-specific logic).
//   3. Neither        → log to console instead of failing, so auth flows and
//      ticket mutations keep working; the Settings page's "Send test email"
//      proves the chain end-to-end.

import { render } from "react-email";
import nodemailer, { type Transporter } from "nodemailer";
import TicketCreatedEmail, { ticketCreatedSubject } from "@/emails/ticket-created";
import TicketStatusEmail, { ticketStatusSubject } from "@/emails/ticket-status";
import VerifyOtpEmail, { verifyOtpSubject } from "@/emails/verify-otp";
import WelcomeEmail, { welcomeSubject } from "@/emails/welcome";
import ResetPasswordEmail, { resetPasswordSubject } from "@/emails/reset-password";
import InviteEmail, { inviteSubject } from "@/emails/invite";
import PromotedEmail, { promotedSubject } from "@/emails/promoted";

// ── TRANSPORTS (lazy — `pnpm dev` without any mail config must never throw) ──

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT?.trim() || 587);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const SMTP_SECURE = process.env.SMTP_SECURE?.trim()
    ? process.env.SMTP_SECURE.trim() === "true"
    : SMTP_PORT === 465; // 👇 465 = implicit TLS; 587/25 start plaintext + STARTTLS

let transporter: Transporter | null = null;
function mailer(): Transporter | null {
    if (transporter) return transporter;
    if (!SMTP_HOST) return null; // no SMTP: fall through to console logging
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        // 👇 Present only when creds exist — some relays auth via IP allowlist
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    return transporter;
}

// 👇 `||` (not ??) on purpose — EMAIL_FROM="" must fall back, not become an
//    empty header (SMTP servers reject empty From; Nodemailer would too).
const FROM = process.env.EMAIL_FROM?.trim() || "Getic <noreply@getic.local>";

/**
 * Fire-and-forget core: ALWAYS resolves (never throws), so an email outage
 * can never break an auth flow or a ticket mutation. Returns whether the
 * mail was actually handed to a provider (false = dev-only console log).
 *
 * Order: Resend HTTPS → SMTP → console. Each falls through only when its
 * config is absent — a configured provider that ERRORS still logs the error
 * and returns false (never throws, never silently "succeeds").
 */
async function sendEmail(
    to: string,
    subject: string,
    html: string,
    opts?: { fromName?: string; replyTo?: string }
): Promise<boolean> {
    // Display From: "Admin Name via Getic <EMAIL_FROM-address>" - shows the
    // sending human while keeping the authenticated domain (deliverability).
    let from = FROM;
    if (opts?.fromName) {
        const addr = FROM.includes("<") ? FROM.slice(FROM.indexOf("<") + 1, FROM.lastIndexOf(">")) : FROM;
        from = `${opts.fromName} via Getic <${addr}>`;
    }

    // ── 1. RESEND (HTTPS API — the Vercel-safe path) ──
    // POST https://api.resend.com/emails — plain fetch, no SDK, runs on the
    // Node runtime with zero extra deps. resend.com custom 401/422 errors are
    // surfaced verbatim so the test-email route shows WHY a send failed.
    if (RESEND_API_KEY) {
        try {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from,
                    to: [to],
                    subject,
                    html,
                    ...(opts?.replyTo ? { reply_to: opts.replyTo } : {}),
                }),
            });
            if (res.ok) return true;
            const body = await res.text();
            console.error(`[email] Resend API ${res.status}:`, body);
            return false;
        } catch (err) {
            console.error("[email] Resend fetch failed:", err);
            return false;
        }
    }

    // ── 2. SMTP (Nodemailer — dev / self-host with egress) ──
    const transport = mailer();
    if (transport) {
        try {
            await transport.sendMail({
                from,
                to,
                subject,
                html,
                ...(opts?.replyTo ? { replyTo: opts.replyTo } : {}),
            });
            return true;
        } catch (err) {
            console.error("[email] SMTP send failed:", err);
            return false;
        }
    }

    // ── 3. NOTHING CONFIGURED → dev-only console log ──
    console.log(
        `[email:dev-only] To: ${to} | Subject: ${subject}` +
        (opts?.replyTo ? ` | Reply-To: ${opts.replyTo}` : "") +
        "\n"
    );
    return false;
}

// ── APP NOTIFICATIONS (ticket routes) ──

export async function sendTicketCreatedEmail(args: {
    to: string;
    customerName: string;
    ticketId: string;
    subject: string;
}) {
    const { to, ...props } = args;
    return sendEmail(to, ticketCreatedSubject(props), await render(<TicketCreatedEmail {...props} />));
}

export async function sendTicketStatusEmail(args: {
    to: string;
    customerName: string;
    ticketId: string;
    subject: string;
    newStatus: string;
}) {
    const { to, ...props } = args;
    return sendEmail(to, ticketStatusSubject(props), await render(<TicketStatusEmail {...props} />));
}

// ── AUTH EMAILS (lib/auth.ts hooks) ──

/** 6-digit signup OTP — fired by the emailOTP plugin's sendVerificationOTP hook. */
export async function sendOtpEmail(args: { to: string; otp: string; type: string }) {
    const { to, ...props } = args;
    return sendEmail(to, verifyOtpSubject(props), await render(<VerifyOtpEmail {...props} />));
}

/** One-time "welcome aboard" — fired on a user's FIRST successful sign-in. */
export async function sendWelcomeEmail(args: { to: string; name?: string }) {
    const { to, ...props } = args;
    return sendEmail(to, welcomeSubject(), await render(<WelcomeEmail {...props} />));
}

/** "Forgot password" magic link — fired by emailAndPassword.sendResetPassword. */
export async function sendResetPasswordEmail(args: { to: string; name?: string; url: string }) {
    const { to, ...props } = args;
    return sendEmail(to, resetPasswordSubject(), await render(<ResetPasswordEmail {...props} />));
}

// --- ORGANIZATION EMAILS (org plugin hook + members role route) ---

/**
 * "You have been invited to join <org>" - fired by lib/auth.ts's
 * sendInvitationEmail. The mail COMES FROM the inviting admin: their name in
 * the From line ("... via Getic"), their address as Reply-To so replies
 * reach the human who sent it.
 */
export async function sendInviteEmail(args: {
    to: string;
    inviterName: string;
    inviterEmail?: string;
    orgName: string;
    role: string;
    inviteUrl: string;
}) {
    const { to, inviterEmail, ...props } = args;
    return sendEmail(to, inviteSubject(props), await render(<InviteEmail {...props} />), {
        fromName: props.inviterName,
        replyTo: inviterEmail,
    });
}

/** Role change notice (promotion to ADMIN / demotion to AGENT) - app/api/members/role. */
export async function sendRoleChangedEmail(args: {
    to: string;
    name?: string;
    orgName: string;
    newRole: "ADMIN" | "AGENT";
    appUrl?: string;
}) {
    const { to, ...props } = args;
    return sendEmail(to, promotedSubject(props), await render(<PromotedEmail {...props} />));
}
