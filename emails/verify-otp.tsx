//
// ─── EMAIL: OTP CODE (email-verification / sign-in / forget-password) ──────
// Fired by the emailOTP plugin's sendVerificationOTP hook (lib/auth.ts).
// Six-digit code instead of a magic link — codes survive copy-paste on
// mobile where link-handoff breaks between browsers and apps.

import { Heading, Text } from "react-email";
import { BrandLayout } from "./layout";

export type VerifyOtpEmailProps = {
    otp: string;
    /** "email-verification" | "sign-in" | "forget-password" (plugin enum). */
    type?: string;
};

export const verifyOtpSubject = (props: VerifyOtpEmailProps) =>
    props.type === "forget-password" ? "Your Getic password-reset code" : "Your Getic verification code";

export default function VerifyOtpEmail({ otp, type }: VerifyOtpEmailProps) {
    const lead =
        type === "forget-password"
            ? "Use this code to reset your Getic password:"
            : type === "sign-in"
              ? "Use this code to sign in to Getic:"
              : "Use this code to verify your email address:";
    return (
        <BrandLayout
            previewText={`Your Getic verification code is ${otp}.`}
            heading="Your verification code"
            footnote="The code expires in 10 minutes. If you didn't request it, you can safely ignore this email."
        >
            <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>{lead}</Text>
            <Heading
                as="h2"
                style={{
                    margin: "0 0 20px",
                    fontSize: "32px",
                    letterSpacing: "8px",
                    color: "#18181b",
                    textAlign: "center",
                }}
            >
                {otp}
            </Heading>
            <Text style={{ margin: 0, fontSize: "12px", color: "#71717a" }}>
                Enter this 6-digit code in the Getic app. Never share it — the Getic team will never ask for it.
            </Text>
        </BrandLayout>
    );
}
