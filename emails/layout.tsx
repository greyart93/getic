//
// ─── BRAND LAYOUT (shared by every email template) ─────────────────────────
// One shell = consistent branding across auth + notification mail. Palette
// mirrors the dashboard's zinc neutrals + blue-800 accent. All styling is
// inline (email clients strip <style> tags); every template composes this
// and passes its own copy via `children`.
//
// PREVIEW: `pnpm email:dev` opens react-email's live previewer over emails/.

import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "react-email";
import type { ReactNode } from "react";

export const palette = {
    bg: "#f4f4f5",
    card: "#ffffff",
    border: "#e4e4e7",
    ink: "#18181b",
    body: "#3f3f46",
    muted: "#71717a",
    faint: "#a1a1aa",
    accent: "#1e40af",
} as const;

export type BrandLayoutProps = {
    /** Preheader text (the snippet after the subject in the inbox list). */
    previewText: string;
    /** The big headline of the email. */
    heading: string;
    /** The message body (Text components). */
    children: ReactNode;
    /** Optional CTA button + plain-text fallback link (verification, open ticket). */
    actionLabel?: string;
    actionUrl?: string;
    /** Small line under the CTA (e.g. "The link expires in 1 hour."). */
    footnote?: string;
};

export function BrandLayout({ previewText, heading, children, actionLabel, actionUrl, footnote }: BrandLayoutProps) {
    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body
                style={{
                    margin: 0,
                    padding: "24px 0",
                    background: palette.bg,
                    fontFamily: '-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
                }}
            >
                <Container
                    style={{
                        maxWidth: "520px",
                        margin: "0 auto",
                        background: palette.card,
                        borderRadius: "12px",
                        border: `1px solid ${palette.border}`,
                        overflow: "hidden",
                    }}
                >
                    <Section style={{ padding: "20px 24px", borderBottom: `1px solid ${palette.border}` }}>
                        <Text style={{ margin: 0, display: "inline", fontWeight: 700, fontSize: "15px", color: palette.ink }}>
                            Getic
                        </Text>
                        <Text style={{ margin: 0, display: "inline", float: "right", fontSize: "12px", color: palette.muted }}>
                            Support Desk
                        </Text>
                    </Section>

                    <Section style={{ padding: "24px" }}>
                        <Heading as="h1" style={{ margin: "0 0 12px", fontSize: "18px", color: palette.ink }}>
                            {heading}
                        </Heading>
                        {children}
                        {actionUrl ? (
                            <>
                                <Button
                                    href={actionUrl}
                                    style={{
                                        display: "inline-block",
                                        marginTop: "8px",
                                        padding: "10px 18px",
                                        background: palette.accent,
                                        color: "#ffffff",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                    }}
                                >
                                    {actionLabel ?? "Open"}
                                </Button>
                                <Text style={{ margin: "16px 0 0", fontSize: "12px", color: palette.faint, wordBreak: "break-all" }}>
                                    Or paste this link:{" "}
                                    <Link href={actionUrl} style={{ color: palette.accent }}>
                                        {actionUrl}
                                    </Link>
                                </Text>
                                {footnote ? (
                                    <Text style={{ margin: "12px 0 0", fontSize: "12px", color: palette.faint }}>{footnote}</Text>
                                ) : null}
                            </>
                        ) : null}
                    </Section>

                    <Hr style={{ borderColor: palette.border, margin: 0 }} />
                    <Section style={{ padding: "16px 24px" }}>
                        <Text style={{ margin: 0, fontSize: "12px", color: palette.faint }}>
                            Sent by Getic — you are receiving this because you have an account or submitted a ticket.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}
