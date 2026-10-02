//
// ─── ACCESS CONTROL (shared by server + client) ─────────────────────────────
// Better Auth's permission system: statements (resources) → roles → allowed
// operations. This module is the single source of truth imported by BOTH
// lib/auth.ts (server) and lib/auth-client.ts (client) — the client mirrors
// the server's roles so authClient.admin.setRole() types our "ADMIN" |
// "AGENT" strings instead of the library defaults ("admin"/"user").
//
// TWO SEPARATE ACCESS-CONTROL INSTANCES (do not mix them):
//   1. GLOBAL app RBAC (`ac`) → the Admin plugin. User.role (ADMIN | AGENT)
//      on the user row — global user management (set-role, ban, list-users).
//      The ticket/note statements here are OUR app vocabulary, checked in
//      lib/rbac.ts.
//   2. ORG-SCOPED AC (`orgAc`) → the organization plugin. Statements are the
//      plugin's OWN five (organization | member | invitation | team | ac —
//      verified against better-auth@1.7.5 dist/plugins/organization/access).
//      Adding unknown statements to the org AC silently breaks invites.
//      Roles: OWNER (the org creator; can delete the org), ADMIN (≤10 per
//      org — manage members/invites), AGENT (≤1000 — work tickets).
//
// ⚠️ NAME COLLISION WARNING: the organization plugin reserves the "owner"
// role name (creatorRole default). Use OWNER/ADMIN/AGENT — never reuse
// "owner" for a custom role or plugin checks misfire.

import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

// ── 1. GLOBAL APP RBAC (Admin plugin) ──────────────────────────────────────

export const ac = createAccessControl({
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
    // 👇 App-domain statements (our own; checked in lib/rbac.ts / API routes)
    ticket: ["create", "read", "update", "delete"],
    note: ["create", "read", "delete"],
    // 👇 Org-seat vocabulary for the seat-limit enforcement (lib/rbac.ts)
    org: ["manage", "invite", "remove-member", "set-role"],
});

export const adminRole = ac.newRole({
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
    ticket: ["create", "read", "update", "delete"],
    note: ["create", "read", "delete"],
    org: ["manage", "invite", "remove-member", "set-role"],
});

export const agentRole = ac.newRole({
    ticket: ["create", "read", "update"], // no delete — ADMIN-only destructive op
    note: ["create", "read"],
});

// ── 2. ORG-SCOPED AC (organization plugin) ─────────────────────────────────
// 👇 MUST be built from defaultStatements (the plugin's own five) — a custom
//    statement list here breaks createInvitation with ORGANIZATION error 400s.

export const orgAc = createAccessControl(defaultStatements);

export const ownerRole = orgAc.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
});

export const orgAdminRole = orgAc.newRole({
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
});

export const orgAgentRole = orgAc.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ["read"],
});

// ── SHARED LIMITS (org seats) ──
// Enforced in lib/auth.ts sendInvitationEmail (BEFORE Better Auth writes the
// invitation row) and surfaced in the UI via lib/auth-client — one source of
// truth for "≤10 admins, ≤1000 agents per org".
export const ORG_LIMITS = { maxAdmins: 10, maxAgents: 1000 } as const;

// 👇 Convenience literals — always use these, never bare strings
export type AppRole = "ADMIN" | "AGENT";
export type OrgRole = "OWNER" | "ADMIN" | "AGENT";

// 👇 member.role strings written by the org creator bootstrap (lib/auth.ts)
//    and invite hook — one place maps them to the org AC roles above.
export const ORG_ROLE_ROLES = { OWNER: ownerRole, ADMIN: orgAdminRole, AGENT: orgAgentRole } as const;
