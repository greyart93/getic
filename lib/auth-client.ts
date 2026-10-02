"use client"

//
// ─── BETTER AUTH CLIENT ─────────────────────────────────────────────────────
// Browser-side handle to the auth API mounted at /api/auth. Same-domain, so
// no baseURL needed. Sign-in surfaces: credentials, Google/GitHub OAuth,
// 6-digit OTP (verify-email / forgot-password), org management.
//
// PLUGINS MIRRORED (keep in sync with lib/auth.ts — the client types its
// methods from the SERVER plugin's $InferServerPlugin):
//   - adminClient        → authClient.admin.setRole / listUsers / banUser …
//   - emailOTPClient     → authClient.emailOtp.sendVerificationOtp /
//                          verifyEmail — the 6-digit flows.
//   - organizationClient → authClient.organization.* (create/switch org,
//                          invite members, accept invites) + the reactive
//                          hooks (useActiveOrganization, useListOrganizations,
//                          useActiveMember) used by the org pages.

import { createAuthClient } from "better-auth/react"
import { adminClient, emailOTPClient, organizationClient } from "better-auth/client/plugins"
import { ac, adminRole, agentRole, orgAc, orgAdminRole, orgAgentRole } from "@/lib/access"

export const authClient = createAuthClient({
    // 👇 Same origin as the API — omitting baseURL is the documented default.
    plugins: [
        adminClient({ ac, roles: { ADMIN: adminRole, AGENT: agentRole } }),
        emailOTPClient(),
        organizationClient({
            ac: orgAc,
            roles: { ADMIN: orgAdminRole, AGENT: orgAgentRole },
        }),
    ],
})

// 👇 Convenience re-exports (the shadcn-era style used across this app)
export const { signIn, signOut, signUp, useSession } = authClient

// Session shape: { data: { session, user } | null, isPending, error }
// user.role: "ADMIN" | "AGENT" (typed from the server's Role enum)
export type AuthUser = NonNullable<ReturnType<typeof useSession>["data"]>["user"]
