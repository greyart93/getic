//
// ─── EMAIL: WELCOME ABOARD ─────────────────────────────────────────────────
// Sent once on a user's FIRST successful sign-in (session.create database
// hook in lib/auth.ts — OAuth signups land there too, so it's the single
// reliable spot for "first time" detection).

import { Text } from "react-email";
import { BrandLayout } from "./layout";

export type WelcomeEmailProps = {
    name?: string;
};

export const welcomeSubject = () => "Welcome to Getic 👋";

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
    return (
        <BrandLayout
            previewText="Your Getic support desk is ready."
            heading={`Welcome aboard${name ? `, ${name}` : ""}!`}
        >
            <Text style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                Your Getic workspace is ready. Create your first ticket, invite teammates, and keep every customer
                conversation in one place.
            </Text>
            <Text style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#3f3f46" }}>
                — The Getic team
            </Text>
        </BrandLayout>
    );
}
