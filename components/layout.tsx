"use client";

import { useState } from "react";
import { Menu, X, Plus } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeToggle } from "./ui/toggle-theme";
import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { TicketFormDialog } from "@/components/ticket-form-dialog";
import { useTicketStore } from "@/lib/store";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 👇 GET THE ADD ACTION FROM ZUSTAND
  const addTicket = useTicketStore((state) => state.addTicket);

  // 👇 REPLACED 50+ LINES OF CODE WITH THIS SINGLE HANDLER
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
            {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Desktop Toggle */}
          <button
            onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            className="hidden md:flex p-2 rounded-md hover:bg-accent mr-auto"
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* New Ticket Button */}
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Ticket</span>
              <span className="sm:hidden">New</span>
            </Button>

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

      {/* Create Ticket Dialog */}
      <TicketFormDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
        initialData={null} 
        onSave={handleCreateTicket}
      />
    </div>
  );
}