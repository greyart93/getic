// components/ui/toggle-theme.tsx
"use client";

import * as React from "react";
import { useThemeTransition } from "@/hooks/use-theme-transition";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { toggleTheme, resolvedTheme } = useThemeTransition();
  const [mounted, setMounted] = React.useState(false);

  // Only show theme-dependent content after mounting on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Render a simple placeholder during SSR to avoid mismatch
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="border-border/60 hover:border-border hover:bg-accent transition-colors relative"
      >
        <Sun className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="border-border/60 hover:border-border hover:bg-accent transition-colors relative"
    >
      <Sun 
        className={`size-4 transition-all duration-300 ${
          resolvedTheme === "dark" 
            ? "opacity-100 rotate-0 scale-100" 
            : "opacity-0 rotate-90 scale-50 absolute"
        }`}
      />
      <Moon 
        className={`size-4 transition-all duration-300 ${
          resolvedTheme === "dark" 
            ? "opacity-0 -rotate-90 scale-50 absolute" 
            : "opacity-100 rotate-0 scale-100"
        }`}
      />
    </Button>
  );
}