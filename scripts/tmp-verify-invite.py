// TEMP verify: re-invite re-sends (no more "already invited" dead-end) and
// the invite carries the admin's identity.
//   npx tsx scripts/tmp-verify-invite.tsx
import "dotenv/config";
import { makeSignature } from "better-auth/crypto";
import { prisma } from "../lib/prisma";

const secret = process.env.BETTER_AUTH_SECRET!;
const token = "verify-invite-token-0123456789abcd";
const admin = await prisma.user.findFirst({ where: { role: "ADMIN", email: "pythoncpp07@gmail.com" } });
await prisma.session.deleteMany({ where: { token } });
await prisma.session.create({
    data: {
        id: "sess_verify_invite_tmp",
        userId: admin!.id,
        token,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        activeOrganizationId: "org_default",
        ipAddress: "127.0.0.1",
    },
});
const cookie = `better-auth.session_token=${token}.${await makeSignature(token, secret)}`;

const invite = async () => {
    const res = await fetch("http://localhost:3000/api/auth/organization/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Cookie: cookie },
        body: JSON.stringify({ email: "reinvite-probe@getic.test", organizationId: "org_default", role: "AGENT" }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};

const first = await invite();
console.log("1. first invite:", first.status, first.body.id ? "id=" + first.body.id : JSON.stringify(first.body));

const second = await invite();
console.log("2. re-invite (was the 400 dead-end):", second.status, second.body.id ? "new id=" + second.body.id : JSON.stringify(second.body));

const pending = await prisma.invitation.findMany({
    where: { email: "reinvite-probe@getic.test", organizationId: "org_default" },
    select: { id: true, status: true },
});
console.log("3. rows left for that email:", JSON.stringify(pending));

// cleanup
await prisma.invitation.deleteMany({ where: { email: "reinvite-probe@getic.test" } });
await prisma.session.deleteMany({ where: { id: "sess_verify_invite_tmp" } });
console.log("cleaned");
await prisma.$disconnect();
