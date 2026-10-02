//
// ─── EMAIL: PROMOTED TO ADMIN ──────────────────────────────────────────────
// Sent by app/api/members/role/route.ts when an org admin promotes an agent
// (or demotes an admin). The CTA opens /organization, where the member list
// shows the new role immediately.

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type PromotedEmailProps = {
    name?: string;
    orgName: string;
    newRole: "ADMIN" | "AGENT";
    /** Absolute app base (mail clients cannot follow relative links). */
    appUrl?: string;
};

export const promotedSubject = (p: PromotedEmailProps) =>
    p.newRole === "ADMIN"
        ? `You are now an ADMIN in ${p.orgName} on Getic`
        : `Your role in ${p.orgName} on Getic changed to AGENT`;

export default function PromotedEmail({ name, orgName, newRole, appUrl }: PromotedEmailProps) {
    const isAdmin = newRole === "ADMIN";
    return (
        <BrandLayout
            previewText={isAdmin ? "You have been promoted to ADMIN." : "Your role has been updated."}
            heading={isAdmin ? `You are now an ADMIN in ${orgName}` : `You are now an AGENT in ${orgName}`}
            actionLabel="Open Getic"
            actionUrl={`${appUrl ?? "http://localhost:3000"}/organization`}
            footnote="Reload the page after signing in to pick up your new role."
        >
            <Text style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Hi{name ? ` ${name}` : ""},
            </Text>
            <Text style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                {isAdmin ? (
                    <>
                        An administrator promoted you to <strong>ADMIN</strong> in the organization{" "}
                        <strong>{orgName}</strong>.
                    </>
                ) : (
                    <>
                        Your role in the organization <strong>{orgName}</strong> was changed to{" "}
                        <strong>AGENT</strong>.
                    </>
                )}
            </Text>
            {isAdmin ? (
                <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                    As an ADMIN you can manage the room: invite members, change roles, and administer
                    tickets. Click the button below to open Getic and join the organization with your
                    new role.
                </Text>
            ) : (
                <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                    Click the button below to open Getic and continue working tickets.
                </Text>
            )}
            <Text style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                — The Getic team
            </Text>
        </BrandLayout>
    );
}
