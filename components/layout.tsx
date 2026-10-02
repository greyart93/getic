//
// ─── APP SHELL: SIDEBAR + HEADER + PAGE CONTENT ─────────────────────────
// Wraps every page (both routes render children through this). Responsibilities:
//   - Collapsible sidebar (mobile: slide-in overlay / desktop: toggle collapse)
//   - Header row with sidebar toggles, the "New Ticket" button and theme toggle
//   - The CREATE dialog lives HERE (not in main.tsx) because the button is in
//     the header — same TicketFormDialog component, reused with initialData
//     = null for create (main.tsx passes a ticket for edit).

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Plus, PanelLeft, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeToggle } from "./ui/toggle-theme";
import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { TicketFormDialog } from "@/components/ticket-form-dialog";
import { useTicketStore } from "@/lib/store";
import { AuthGate } from "@/components/auth-gate";
import { UserMenu } from "@/components/user-menu";
import { OrgSwitcher } from "@/components/org-switcher";

// >> ONBOARDING GATE (flow B): every app-shell page requires a workspace.
//    A signed-in user with NO organization (fresh signup, or removed from
//    their only room) is routed to /welcome to create a room, join by
//    ID+password, or accept a pending invitation. /welcome itself and the
//    invite deep-link (?invite=) on /organization are exempt - they ARE the
//    onboarding surface. The check reads the org-list atom (same source the
//    sidebar chip uses); it never blocks users who HAVE rooms.
const ONBOARDING_EXEMPT = ["/welcome", "/organization"];

function OrgGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: orgs, isPending } = authClient.useListOrganizations();
  const exempt = ONBOARDING_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const needsOnboarding = !isPending && !exempt && (orgs ?? []).length === 0;

  useEffect(() => {
    if (needsOnboarding) {
      router.replace("/welcome");
    }
  }, [needsOnboarding, router]);

  // >> NO FLASH OF PROTECTED PAGES: while the org list is still being fetched
  //    we render a neutral loader instead of the app shell. A fresh signup
  //    (0 rooms) therefore never sees /tickets appear and vanish - the
  //    redirect decision is made BEFORE anything renders. Exempt pages
  //    (/welcome, /organization) render immediately; they ARE onboarding.
  if (isPending && !exempt) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (needsOnboarding) return null;
  return <>{children}</>;
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  // Mobile sidebar is closed by default, desktop open
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 👇 Select just the one action we need (selector = re-render only on change)
  const addTicket = useTicketStore((state) => state.addTicket);

  // Create flow: addTicket owns loading/success/error toasts inside the store;
  // we only close the dialog on success (addTicket throws on failure).
  const handleCreateTicket = async (data: { subject: string; customerName: string; customerEmail: string; description: string }) => {
    try {
      await addTicket(data)
      setIsCreateDialogOpen(false)
    } catch (error) {
      // Error toast is already handled in the store
      console.error(error)
    }
  };

  return (
    <AuthGate>
      <OrgGate>
      <div className="min-h-[90svh] border-2 m-0 md:m-3 rounded-xl flex border-transparent md:border-border p-0 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          fixed md:relative z-40
          h-full md:h-auto overflow-hidden
          bg-[#fafafa] dark:bg-[#0f0f11]
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0 w-70 min-w-45 border-r-2 p-3" : "-translate-x-full w-70 min-w-45 p-3 md:p-0"}
          ${isDesktopSidebarOpen ? "md:translate-x-0 md:w-[15%] md:min-w-45 md:border-r-2 md:rounded-l-xl md:p-3" : "md:-translate-x-[200%] md:w-0 md:min-w-0 md:border-r-0 md:p-0"}
        `}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="size-5" />
        </button>

        <NavBar closeSidebar={() => setIsSidebarOpen(false)} />
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Header Content */}
      <div className="flex-1 p-3 min-w-0 overflow-x-hidden">
        <header className="flex justify-start items-center mb-4 gap-2">
          {/* Mobile Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-md hover:bg-accent mr-auto"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="size-5" /> : <PanelLeft className="size-5" />}
          </button>

          {/* Desktop Toggle */}
          <button
            onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            className="hidden md:flex p-2 rounded-md hover:bg-accent mr-auto"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="size-5" />
          </button>

          {/* ACTIVE ORG SWITCHER (status-filter dropdown pattern): shows the
              room every query is scoped to; click to switch org/department
              from any page - admins and agents both. HIDDEN on mobile - it
              crowds the header there; the sidebar's "Active org" chip and
              the Organization page cover it (see responsive fix). */}
          <div className="hidden md:block">
            <OrgSwitcher />
          </div>

          <div className="flex items-center gap-2">
            {/* New Ticket Button */}
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Ticket</span>
              <span className="sm:hidden">New</span>
            </Button>

            {/* Signed-in identity: avatar + role + sign out (Better Auth) */}
            <UserMenu />

            {/* Dark/Light Mode */}
            {/* <ModeToggle /> */}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main>
          {children}
        </main>
      </div>

      {/* Create Ticket Dialog — same component as Edit, initialData=null */}
      <TicketFormDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
        initialData={null} 
        onSave={handleCreateTicket}
      />
    </div>
      </OrgGate>
    </AuthGate>
  );
}