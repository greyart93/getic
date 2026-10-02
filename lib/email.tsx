//
// ─── EMAIL SENDER (SMTP via NODEMAILER) ─────────────────────────────────────
// The single send path for ALL app email:
//   - Better Auth hooks (OTP verification / password reset) — lib/auth.ts
//   - App notifications (ticket created / status changed) — ticket API routes
//   - Product mail (welcome on first sign-in, org invites) — misc routes
//
// TEMPLATES: React components in `emails/` (react-email v6), rendered to HTML
// with `render()`. Preview them live: `pnpm email:dev`. SMTP creds are plain
// env vars — Gmail (App Password), Brevo, Mailgun, SES, Ethereal (dev) all
// speak SMTP, so there is no vendor SDK or API-key logic anywhere here.
//
// GRACEFUL DEGRADATION: without SMTP_HOST the sender logs the mail to the
// server console instead of failing — auth flows and ticket mutations keep
// working locally and in preview deploys. Production sets the vars; the
// Settings page's "Send test email" proves the chain end-to-end.

import { render } from "react-email";
import nodemailer, { type Transporter } from "nodemailer";
import TicketCreatedEmail, { ticketCreatedSubject } from "@/emails/ticket-created";
import TicketStatusEmail, { ticketStatusSubject } from "@/emails/ticket-status";
import VerifyOtpEmail, { verifyOtpSubject } from "@/emails/verify-otp";
import WelcomeEmail, { welcomeSubject } from "@/emails/welcome";
import ResetPasswordEmail, { resetPasswordSubject } from "@/emails/reset-password";
import InviteEmail, { inviteSubject } from "@/emails/invite";
import PromotedEmail, { promotedSubject } from "@/emails/promoted";

// ── TRANSPORT (lazy — `pnpm dev` without SMTP config must never throw here) ──

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
    if (!SMTP_HOST) return null; // dev mode: send() logs instead of sending
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
 * mail was actually handed to SMTP (false = dev-only console log).
 */
async function sendEmail(
    to: string,
    subject: string,
    html: string,
    opts?: { fromName?: string; replyTo?: string }
): Promise<boolean> {
    const transport = mailer();
    if (!transport) {
        console.log(
            `[email:dev-only] To: ${to} | Subject: ${subject}` +
            (opts?.replyTo ? ` | Reply-To: ${opts.replyTo}` : "") +
            "\n"
        );
        return false;
    }
    // Display From: "Admin Name via Getic <EMAIL_FROM-address>" - shows the
    // sending human while keeping the authenticated domain (deliverability).
    let from = FROM;
    if (opts?.fromName) {
        const addr = FROM.includes("<") ? FROM.slice(FROM.indexOf("<") + 1, FROM.lastIndexOf(">")) : FROM;
        from = `${opts.fromName} via Getic <${addr}>`;
    }
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
