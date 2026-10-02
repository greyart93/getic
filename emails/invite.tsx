//
// ─── EMAIL: ORGANIZATION INVITATION ────────────────────────────────────────
// Fired by the organization plugin's sendInvitationEmail hook (lib/auth.ts)
// every time an admin invites someone to a room. The CTA deep-links to
// /organization?invite=<invitationId> where the accept-invitation card sits.
// Without SMTP configured lib/email.tsx logs this mail to the dev console.

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type InviteEmailProps = {
    inviterName: string;
    orgName: string;
    role: string;
    inviteUrl: string;
};

export const inviteSubject = (p: InviteEmailProps) =>
    `${p.inviterName} invited you to join ${p.orgName} on Getic`;

export default function InviteEmail({ inviterName, orgName, role, inviteUrl }: InviteEmailProps) {
    return (
        <BrandLayout
            previewText={`You have been invited to join ${orgName} as ${role}.`}
            heading={`Join ${orgName} on Getic`}
            actionLabel="Accept invitation"
            actionUrl={inviteUrl}
            footnote="This invitation expires in 7 days."
        >
            <Text style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Hi,
            </Text>
            <Text style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                <strong>{inviterName}</strong> has invited you to join the organization{" "}
                <strong>{orgName}</strong> on Getic as a <strong>{role}</strong>.
            </Text>
            <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Click the button below to accept. If you do not have an account yet, you can sign in
                or sign up with this email address first, then accept the invitation.
            </Text>
            <Text style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                — The Getic team
            </Text>
        </BrandLayout>
    );
}
