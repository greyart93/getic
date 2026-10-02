import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// ─── BETTER AUTH ROUTE HANDLER (catch-all) ─────────────────────────────────
// Mounts the ENTIRE auth API under /api/auth/*:
//   POST /api/auth/sign-up/email         (credentials)
//   POST /api/auth/sign-in/email         (credentials)
//   GET  /api/auth/sign-in/social        (OAuth start → provider)
//   GET  /api/auth/callback/google       (OAuth redirect back — registered at Google)
//   GET  /api/auth/callback/github       (OAuth redirect back — registered at GitHub)
//   POST /api/auth/sign-out
//   GET  /api/auth/get-session
//   /api/auth/admin/*                    (Admin plugin — set-role, ban, list-users)
//   /api/auth/verify-email               (email verification link target)
//
// Nothing app-specific lives here — all logic is in lib/auth.ts. This file is
// only the Next.js plumbing (toNextJsHandler adapts Request/Response).

export const { GET, POST } = toNextJsHandler(auth);
