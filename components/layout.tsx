"use client";

import { useState } from "react";
import { Menu, X, Plus } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { TicketFormDialog } from "@/components/ticket-form-dialog";
import { useTicketStore } from "@/lib/store";
import { Toaster, toast } from "@/components/ui/toast";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 👇 GET THE ADD ACTION FROM ZUSTAND
  const addTicket = useTicketStore((state) => state.addTicket);

  // 👇 REPLACED 50+ LINES OF CODE WITH THIS SINGLE HANDLER
  const handleCreateTicket = async (data: { subject: string; customerName: string; customerEmail: string }) => {
    const toastId = toast.add({
      title: "Creating ticket...",
      type: "loading",
      timeout: 0, // don't auto-dismiss while loading
    })
    try {
      await addTicket(data)
      toast.update(toastId, { title: "Ticket created!", type: "success", timeout: 3000 })
      setIsCreateDialogOpen(false)
    } catch {
      toast.update(toastId, { title: "Failed to create ticket", type: "error", timeout: 4000 })
    }
  };

  return (
    <Toaster>
    <div className="min-h-[90svh] border-2 m-0 md:m-3 rounded-xl flex border-transparent md:border-border p-0">
      {/* Sidebar */}
      <div
        className={`
          fixed md:relative z-40
          w-70 md:w-[13%] min-w-45
          h-full md:h-auto
          border-r-2 rounded-none md:rounded-l-xl p-3
          bg-[#fafafa] dark:bg-[#0f0f11]
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
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
      <div className="flex-1 p-3">
        <header className="flex justify-end items-center mb-4 gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-md hover:bg-accent mr-auto"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* New Ticket Button */}
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" />
            New Ticket
          </Button>

          {/* Dark/Light Mode */}
          <ModeToggle />
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
    </Toaster>
  );
}