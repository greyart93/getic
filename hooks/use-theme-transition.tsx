"use client";

import { useTheme } from "next-themes";

export function useThemeTransition() {
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = (event: React.MouseEvent<HTMLElement>) => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";

    // Fallback for browsers without support (Firefox, older Safari)
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return { toggleTheme, resolvedTheme };
}