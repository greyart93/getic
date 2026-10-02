//
// ─── BETTER AUTH SERVER INSTANCE ────────────────────────────────────────────
// The single server-side auth object. Better Auth mounts every auth endpoint
// (sign-in/up/out, OAuth callbacks, OTP verify, org management) under
// /api/auth/* — see app/api/auth/[...all]/route.ts. Client code uses
// lib/auth-client.ts (never this file).
//
// SIGN-IN METHODS (all converge on one User row; Account holds a row per
// provider identity, so a user can link several):
//   1. Email + password          (emailAndPassword)
//   2. Email + 6-digit OTP code  (emailOTP plugin)
//   3. Google OAuth              (socialProviders.google)
//   4. GitHub OAuth              (socialProviders.github)
//
// PLUGINS:
//   - emailOTP     → 6-digit verification on signup; OTP sign-in. The
//                    forget-password flow is part of emailAndPassword.
//   - organization → multi-tenant "rooms". Every Ticket row carries
//                    organizationId (the tenant wall — lib/rbac.ts). The org
//                    creator becomes ADMIN (creatorRole); invites go out by
//                    email (sendInvitationEmail hook). Seat limits: ≤10
//                    ADMINs and ≤1000 AGENTs per org, enforced in that hook
//                    before Better Auth writes the invite row.
//   - admin        → global user management (set-role, ban, list-users).
//
// EMAIL: every hook delegates to lib/email.tsx (Nodemailer/SMTP). Without
// SMTP_HOST the sender logs mail to the server console instead of sending —
// all flows keep working in dev (graceful degradation).

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, emailOTP, organization } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import {
    sendOtpEmail,
    sendWelcomeEmail,
    sendResetPasswordEmail,
    sendInviteEmail,
} from "@/lib/email";
import { ac, adminRole, agentRole, orgAc, orgAdminRole, orgAgentRole, ORG_LIMITS } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export const auth = betterAuth({
    // 👇 Prisma 7 driver-adapter client (lib/prisma.ts) — same Postgres DB as
    //    the Ticket/Note tables (one database, one migration history).
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    // 👇 Required: HMAC secret for session tokens/cookies (32+ chars).
    //    Generate: `openssl rand -base64 32`
    secret: process.env.BETTER_AUTH_SECRET,
    // 👇 Base URL of the app — OAuth providers redirect back here; the origin
    //    check also validates it. Must match the registered callback URLs at
    //    Google/GitHub consoles exactly. (Keep .env values on their own line —
    //    an inline `# …` glued to the value once truncated this URL and broke
    //    sign-in with 403 INVALID_ORIGIN.)
    baseURL: process.env.BETTER_AUTH_URL,

    // ── METHOD 1: EMAIL + PASSWORD (+ forgot-password link) ──
    emailAndPassword: {
        enabled: true,
        // 👇 Minimum password length (default 8).
        minPasswordLength: 8,
        // 👇 "Forgot password" mail. The /forgot-password page posts
        //    authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        //    Better Auth mints a one-hour token and the link lands here.
        sendResetPassword: async ({ user, url }) => {
            await sendResetPasswordEmail({ to: user.email, name: user.name ?? undefined, url });
        },
        // 👇 Reset links live 1 hour (default is also 1h — kept explicit).
        resetPasswordTokenExpiresIn: 3600,
    },

    // ── EMAIL VERIFICATION (OTP) ──
    // The emailOTP plugin below intercepts the verification flow with 6-digit
    // codes (no magic link to lose on mobile). requireEmailVerification stays
    // FALSE: signup works immediately, but every protected route in
    // lib/rbac.ts refuses unverified users (403 EMAIL_NOT_VERIFIED) — gating
    // in app code instead of at sign-in keeps OAuth/OTP/credentials uniform.
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            // 👇 Only fires when the emailOTP plugin is absent (it replaces
            //    this hook with codes). Kept as a safety net.
            await sendOtpEmail({ to: user.email, otp: url, type: "email-verification" });
        },
    },

    // ── ACCOUNT LINKING (OAuth onto an existing credentials account) ──
    // By default better-auth refuses to link a Google/GitHub identity onto an
    // existing user whose email is NOT verified - credentials signups stay
    // unverified until they finish the OTP flow, so "Sign in with Google"
    // with the same address died with ACCOUNT_NOT_LINKED (error page). The
    // email arrives verified from the provider itself, so we relax only the
    // LOCAL-verification requirement (different-email linking stays off).
    account: {
        accountLinking: {
            requireLocalEmailVerified: false,
        },
    },

    // ── METHODS 3 & 4: SOCIAL OAUTH ──
    socialProviders: {
        google: {
            // 👇 Register at https://console.cloud.google.com/apis/credentials
            //    → OAuth client (Web) → Authorized redirect URIs:
            //    {BETTER_AUTH_URL}/api/auth/callback/google
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        github: {
            // 👇 Register at https://github.com/settings/developers → OAuth App
            //    → Authorization callback URL:
            //    {BETTER_AUTH_URL}/api/auth/callback/github
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },

    // 👇 Multi-tenant bootstrap on EVERY new user (credentials or OAuth):
    //    1. FIRST_ADMIN_EMAIL env → that address is promoted to ADMIN
    //       (direct Prisma write — admin endpoints need an existing admin
    //       session, which is exactly what we're bootstrapping).
    //    2. Personal Organization ("room") auto-created with the user as
    //       ADMIN-member, so a fresh signup immediately has a workspace.
    //       Companies sharing one room invite agents into the admin's org.
    //    3. Welcome email (no-op without SMTP — lib/email.tsx logs in dev).
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        // ── 1. FIRST-ADMIN BOOTSTRAP ──
                        const firstAdmin = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase();
                        if (firstAdmin && user.email.toLowerCase() === firstAdmin) {
                            await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
                            console.log(`[auth] ⭐ ${user.email} bootstrapped as first ADMIN`);
                        } else {
                            console.log(`[auth] new user: ${user.email} (role set by defaultRole)`);
                        }

                        // >> NO PERSONAL ORG (design decision, 2026-09-29):
                        //    a fresh signup has NO room. They land on /welcome
                        //    (create a room / join by ID / accept pending
                        //    invitations). Previously every signup auto-created
                        //    a "<name>'s org" personal room, which made the
                        //    onboarding screen unreachable and put new users
                        //    inside a useless one-person room. To restore the
                        //    old behavior, re-add a prisma.organization.create
                        //    here with a unique slug + joinCode.

                    } catch (err) {
                        // 👇 Never break signup over the welcome mail / org
                        //    creation race (retries log loudly instead).
                        console.error("[auth] post-signup hooks failed (non-fatal):", err);
                    }
                },
            },
        },

        // ── FIRST-LOGIN WELCOME ──
        // user.create fires on SIGNUP (before verification), but users only
        // reach the app through a SESSION - so the welcome mail lives here.
        // First-session detection: any earlier session row = not first.
        // Catch-all: an email outage must never block sign-in.
        session: {
            create: {
                after: async (session) => {
                    try {
                        const earlier = await prisma.session.count({
                            where: { userId: session.userId, id: { not: session.id } },
                        });
                        if (earlier === 0) {
                            const user = await prisma.user.findUnique({ where: { id: session.userId } });
                            if (user) {
                                await sendWelcomeEmail({ to: user.email, name: user.name ?? undefined });
                                console.log(`[auth] 👋 first-login welcome -> ${user.email}`);
                            }
                        }
                    } catch (err) {
                        console.error("[auth] welcome-email hook failed (non-fatal):", err);
                    }
                },
            },
        },
    },

    plugins: [
        // ── RBAC + USER MANAGEMENT (global) ──
        // Adds /api/auth/admin/* endpoints (set-role, ban, list-users…).
        admin({
            ac,
            roles: { ADMIN: adminRole, AGENT: agentRole },
            adminRoles: ["ADMIN"],
            defaultRole: "AGENT",
        }),

        // ── OTP EMAIL VERIFICATION (+ OTP SIGN-IN) ──
        // sendVerificationOnSignUp: on credentials signup a 6-digit code is
        // emailed and emailVerified flips only after the user enters it.
        // Users can also sign in with just email + code (type "sign-in").
        // Unverified users can sign in but every protected route 403s them
        // until verified (the gate lives in lib/rbac.ts — one enforcement
        // point).
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                await sendOtpEmail({ to: email, otp, type });
            },
            otpLength: 6,
            expiresIn: 600, // 10 minutes
            sendVerificationOnSignUp: true,
            storeOTP: "hashed",
        }),

        // ── MULTI-TENANT ORGANIZATIONS ("rooms") ──
        // Org = company workspace. Tickets carry organizationId (tenant wall).
        // creatorRole "ADMIN": the org creator is that room's first admin.
        // sendInvitationEmail → lib/email.tsx; seat limits (≤10 ADMIN, ≤1000
        // AGENT per org) are enforced in the hook below BEFORE the invitation
        // row is written — a rejected invite never reaches the database.
        organization({
            ac: orgAc,
            roles: { ADMIN: orgAdminRole, AGENT: orgAgentRole },
            creatorRole: "ADMIN",

            // >> RE-INVITE = RE-SEND: without this, inviting an email that
            //    already has a pending invitation 400s "USER_IS_ALREADY_INVITED"
            //    even though no mail ever reached them (dev console-only mail,
            //    expired links, wrong address typos...). With it, the plugin
            //    cancels the stale row and writes a fresh one - and our
            //    sendInvitationEmail hook below fires again, so a NEW email
            //    with a NEW link goes out. No more dead-end error.
            cancelPendingInvitationsOnReInvite: true,

            // >> CREATING A ROOM PROMOTES THE CREATOR'S GLOBAL ROLE TO ADMIN.
            //    The plugin itself only writes Member.role (org-scoped); the
            //    global User.role stayed AGENT, so a user who created their
            //    own org never got past requireRole("ADMIN") - /admin/users,
            //    admin set-role etc. were unreachable. Fix: promote here.
            //    NOTE: these hooks live under `organizationHooks` (better-auth
            //    1.7.5) - a top-level afterCreateOrganization is ignored.
            organizationHooks: {
                // >> CREATE: promote the creator's GLOBAL role to ADMIN (the
                //    plugin itself only writes Member.role) + log the event.
                afterCreateOrganization: async ({
                    user,
                    organization,
                }: {
                    user: { id: string; email: string; name?: string | null; role?: string | null };
                    organization: { id: string; name: string };
                    member: { id: string; role: string };
                }) => {
                    try {
                        if ((user as { role?: string }).role !== "ADMIN") {
                            await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
                            console.log(`[org] ⬆️ ${user.email} promoted to global ADMIN (created ${organization.name})`);
                        }
                        await logActivity({
                            type: "ORG_CREATED",
                            organizationId: organization.id,
                            title: `Room "${organization.name}" created`,
                            description: `${user.name ?? user.email} set up this room`,
                            actorId: user.id,
                            actorName: user.name ?? user.email,
                        });
                    } catch (err) {
                        console.error("[org] creator promotion failed (non-fatal):", err);
                    }
                },

                // >> INVITE SENT: log an org event + the personal feed row.
                afterCreateInvitation: async ({ invitation, inviter, organization }) => {
                    try {
                        await logActivity({
                            type: "INVITE_SENT",
                            organizationId: organization.id,
                            title: `Invitation sent to ${invitation.email}`,
                            description: `${inviter.name ?? inviter.email} invited them as ${invitation.role}`,
                            actorId: inviter.id,
                            actorName: inviter.name ?? inviter.email,
                        });
                    } catch (err) {
                        console.error("[org] invite log failed (non-fatal):", err);
                    }
                },

                // >> INVITE ACCEPTED: the room's feed sees the new member.
                afterAcceptInvitation: async ({ invitation, user, organization }) => {
                    try {
                        await logActivity({
                            type: "INVITE_ACCEPTED",
                            organizationId: organization.id,
                            title: `${user.name ?? user.email} joined the room`,
                            description: `Accepted the ${invitation.role} invitation from ${organization.name}`,
                            actorId: user.id,
                            actorName: user.name ?? user.email,
                        });
                    } catch (err) {
                        console.error("[org] accept log failed (non-fatal):", err);
                    }
                },

                // >> MEMBER REMOVED: who took away whose access.
                afterRemoveMember: async ({ member, user, organization }) => {
                    try {
                        await logActivity({
                            type: "MEMBER_REMOVED",
                            organizationId: organization.id,
                            title: `${user.name ?? user.email} removed from the room`,
                            description: `Their ${member.role} seat was released`,
                        });
                    } catch (err) {
                        console.error("[org] remove log failed (non-fatal):", err);
                    }
                },

                // >> ROLE CHANGED: source of truth for "who promoted whom".
                afterUpdateMemberRole: async ({ member, previousRole, user, organization }) => {
                    try {
                        await logActivity({
                            type: "ROLE_CHANGED",
                            organizationId: organization.id,
                            title: `${user.name ?? user.email} is now ${member.role}`,
                            description: `Role changed from ${previousRole} to ${member.role}`,
                            actorId: member.userId,
                        });
                    } catch (err) {
                        console.error("[org] role log failed (non-fatal):", err);
                    }
                },
            },
            invitationExpiresIn: 7 * 24 * 60 * 60, // 7 days
            sendInvitationEmail: async (data) => {
                // 👇 LIMIT ENFORCEMENT (the plugin does not do it natively):
                //    count current members by role; reject past caps. The
                //    invite is created only if this hook resolves.
                const [admins, agents] = await Promise.all([
                    prisma.member.count({
                        where: { organizationId: data.invitation.organizationId, role: "ADMIN" },
                    }),
                    prisma.member.count({
                        where: { organizationId: data.invitation.organizationId, role: "AGENT" },
                    }),
                ]);
                const invitingAdmin = data.invitation.role === "ADMIN";
                if (invitingAdmin && admins >= ORG_LIMITS.maxAdmins) {
                    throw new Error(`ADMIN_SEAT_LIMIT_REACHED (${admins}/${ORG_LIMITS.maxAdmins})`);
                }
                if (!invitingAdmin && agents >= ORG_LIMITS.maxAgents) {
                    throw new Error(`AGENT_SEAT_LIMIT_REACHED (${agents}/${ORG_LIMITS.maxAgents})`);
                }
                // >> THE ACTUAL EMAIL (this was the bug: the hook only
                //    enforced seat limits and logged - no mail ever left).
                //    ABSOLUTE url: mail clients cannot follow relative links,
                //    so anchor it to the app base (same as reset-password).
                const inviteUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/organization?invite=${data.id}`;
                const sent = await sendInviteEmail({
                    to: data.email,
                    // >> The mail COMES FROM the inviting admin: their name in
                    //    the From line ("... via Getic") and Reply-To set to
                    //    their address so the invitee can just hit reply.
                    inviterName: data.inviter.user.name ?? data.inviter.user.email,
                    inviterEmail: data.inviter.user.email,
                    orgName: data.organization.name,
                    role: data.role,
                    inviteUrl,
                });
                console.log(
                    `[org] invite ${sent ? "EMAILED" : "logged (dev, no SMTP)"} → ${data.email} (${data.organization.name}) as ${data.role} | from ${data.inviter.user.email}`
                );
            },
        }),
    ],
});

// ── SESSION TYPE HELPERS ──
// The inferred shape of `{ session, user }` returned by auth.api.getSession()
// — use these types anywhere server code touches the session (rbac, routes).
export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
