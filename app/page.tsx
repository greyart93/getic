//
// ─── ROUTE: / (the tickets table) ──────────────────────────────────────
// Server component that composes the app shell + the client orchestrator.
// All interactivity lives in components/main.tsx ("use client"); this file
// stays a server component so Next can static-render the shell.

import LayoutClient from "@/components/layout";
import Main from "@/components/main";

export default function Page() {
  return (
    <div>
      <LayoutClient>
        <Main />
      </LayoutClient>
    </div>
  )
}