//
// ─── ACTIVITY LOGGER ─────────────────────────────────────────────────────────
// One choke point for writing Activity rows. NEVER throws: logging must not
// break the user flow it observes (same contract as every email sender in
// lib/email.tsx — the app works without the log, it just loses history).
//
// WHO SEES WHAT on /notifications (two sources, merged there):
//   1. Activity rows with organizationId ∈ my orgs → the room's news feed
//      (invite sent/accepted, joined by code, role changes, tickets, notes).
//   2. LIVE Invitation rows pending for MY email → the "invitations" cards
//      with an Accept button (flow D). Read from the Invitation table, not
//      the log, so they appear even if the invite predates the account —
//      and they disappear the moment they are accepted/canceled.
//
// EMISSION POINTS (grep `logActivity(` to find them all):
//   lib/auth.ts              INVITE_SENT / INVITE_ACCEPTED / ORG_CREATED /
//                            ROLE_CHANGED / MEMBER_REMOVED (org-plugin hooks)
//   app/api/org/join         JOINED_VIA_CODE
//   app/api/tickets          TICKET_CREATED
//   app/api/tickets/[id]     STATUS_CHANGED
//   app/api/tickets/[id]/notes NOTE_ADDED

import { prisma } from "@/lib/prisma";

export type ActivityType =
    | "INVITE_SENT"
    | "INVITE_ACCEPTED"
    | "INVITE_CANCELED"
    | "JOINED_VIA_CODE"
    | "ORG_CREATED"
    | "ROLE_CHANGED"
    | "MEMBER_REMOVED"
    | "TICKET_CREATED"
    | "TICKET_ASSIGNED"
    | "STATUS_CHANGED"
    | "NOTE_ADDED";

/**
 * Org-scoped event (visible to every member of that room).
 */
export async function logActivity(e: {
    type: ActivityType;
    organizationId: string;
    title: string;
    description: string;
    actorId?: string | null;
    actorName?: string | null;
}): Promise<void> {
    try {
        await prisma.activity.create({
            data: {
                type: e.type,
                title: e.title,
                description: e.description,
                organizationId: e.organizationId,
                actorId: e.actorId ?? null,
                actorName: e.actorName ?? null,
            },
        });
    } catch (err) {
        console.error("[activity] log failed (non-fatal):", err);
    }
}
