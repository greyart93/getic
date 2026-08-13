"use client";

import { useState } from "react";
import { Menu, X, Plus } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketFormDialog } from "@/components/ticket-form-dialog";
// 👇 Import Zod
import { z } from "zod";

// 👇 Shadcn Dialog Imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 👇 1. DEFINE YOUR ZOD SCHEMA
const TicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  customer: z.string().min(1, "Customer name is required"),
  email: z.email("Invalid email address"),
});

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);


  // 👇 2. STATE FOR INPUT FIELDS
  const [subject, setSubject] = useState("");
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");

  // 👇 3. STATE FOR VALIDATION ERRORS
  const [errors, setErrors] = useState<{ subject?: string; customer?: string; email?: string }>({});

  // 👇 4. HANDLE SUBMIT WITH ZOD VALIDATION
   const handleCreateTicket = (data: { subject: string; customer_name: string; customer_email: string }) => {
    // Clear previous errors
    setErrors({});

     console.log("✅ Creating new ticket:", data);
    // TODO: Send to your API here

    // Validate the data
    const result = TicketSchema.safeParse({
      subject,
      customer,
      email,
    });

    if (!result.success) {
      // 👇 FIX 1: Use 'issues' instead of 'errors'
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0] as string] = issue.message;
        }
      });
      
      // 👇 FIX 2: Actually set the errors in state
      setErrors(formattedErrors);
      
      // 👇 FIX 3: Immediately return so we don't submit
      return; 
    }

    // ✅ IF WE REACH HERE, DATA IS 100% CORRECT
    console.log("✅ DATA IS VALID:", result.data);

    // 🔜 TODO: Replace console.log with your API call here
    // await fetch('/api/tickets', { 
    //   method: 'POST', 
    //   body: JSON.stringify(result.data) 
    // })

    // Close dialog and clear form
    setIsDialogOpen(false);
    setSubject("");
    setCustomer("");
    setEmail("");
  };

  return (
    <div className="min-h-[90svh] border-2 m-0 md:m-3 rounded-xl flex border-transparent md:border-border p-0">
      {/* Sidebar (Same as before) */}
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

          {/* Dialog */}
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
            <TicketFormDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
        initialData={null} // Pass null to indicate CREATE mode
        onSave={handleCreateTicket}
      />
    </div>
  );
}