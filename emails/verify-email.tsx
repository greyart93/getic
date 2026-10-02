//
// ─── EMAIL: VERIFY ADDRESS ─────────────────────────────────────────────────
// Called by Better Auth's emailVerification.sendVerificationEmail hook
// (lib/auth.ts). Flip `requireEmailVerification` to true there once the
// flow is tested end-to-end.

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type VerifyEmailEmailProps = {
    name?: string;
    url: string;
};

export const verifyEmailSubject = () => "Verify your Getic account";

export default function VerifyEmailEmail({ name, url }: VerifyEmailEmailProps) {
    return (
        <BrandLayout
            previewText="Confirm your email address to activate your Getic account."
            heading="Confirm your email"
            actionLabel="Verify email"
            actionUrl={url}
            footnote="The link expires in 1 hour. If you didn't create a Getic account, you can safely ignore this email."
        >
            <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Hi{name ? ` ${name}` : ""}, click the button below to verify your email address and activate your Getic
                account.
            </Text>
        </BrandLayout>
    );
}
