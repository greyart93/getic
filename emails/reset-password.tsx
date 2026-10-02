//
// ─── EMAIL: PASSWORD RESET ─────────────────────────────────────────────────
// Called by Better Auth's emailAndPassword.sendResetPassword hook (lib/auth.ts).

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type ResetPasswordEmailProps = {
    name?: string;
    url: string;
};

export const resetPasswordSubject = () => "Reset your Getic password";

export default function ResetPasswordEmail({ name, url }: ResetPasswordEmailProps) {
    return (
        <BrandLayout
            previewText="A password reset was requested for your Getic account."
            heading="Reset your password"
            actionLabel="Reset password"
            actionUrl={url}
            footnote="The link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password stays unchanged."
        >
            <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Hi{name ? ` ${name}` : ""}, we received a request to reset the password for your Getic account. Click
                below to choose a new one.
            </Text>
        </BrandLayout>
    );
}
