//
// ─── USER PASSWORD RESET (maintenance utility) ─────────────────────────────
// Better Auth stores only a scrypt HASH — plaintext passwords are never
// recoverable. This utility writes a NEW hash using better-auth/crypto's own
// hashPassword(), so the format matches exactly what sign-in expects.
//
//   pnpm user:passwd -- <email> <new-password>
//
// Works for credential users (updates the existing Account.password) and for
// OAuth-only users (creates their credential Account row, linking a password
// alongside the provider identity).

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword, generateRandomString } from "better-auth/crypto";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error("usage: pnpm user:passwd -- <email> <new-password>");
    process.exit(1);
}
if (password.length < 8) {
    console.error("password must be at least 8 characters (Better Auth minPasswordLength)");
    process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
if (!user) {
    console.error(`❌ No user found with email ${email}`);
    process.exit(1);
}

const hash = await hashPassword(password);

const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
});

if (account) {
    await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
    console.log(`✅ Password updated for ${email} (existing credential account ${account.id})`);
} else {
    await prisma.account.create({
        data: {
            id: generateRandomString(32),
            accountId: user.id,
            userId: user.id,
            providerId: "credential",
            password: hash,
        },
    });
    console.log(`✅ Password set for ${email} (credential account created alongside any OAuth identities)`);
}
process.exit(0);
