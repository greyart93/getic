import { IBM_Plex_Sans, Playwrite_IN } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
// import { ModeToggle } from "@/components/mode-toggle";
// import { ThemeToggle } from "@/components/ui/toggle-theme";
import { Toaster } from "@/components/ui/toast"
import { Metadata } from "next";

const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-sans', preload:false })
const playwriteIn = Playwrite_IN({ 
  weight: ['100', '200', '300', '400'], 
  variable: '--font-playwrite', 
})

export const metadata: Metadata = {
  title: {
    default: "GeTiC - Support Ticket Dashboard",
    template: "%s | GeTiC",
  },
  description: "A modern, efficient support ticket management dashboard built with Next.js.",
  metadataBase: new URL("https://github.com/greyart93/getic"), 
  authors: [{ name: "Saud Mullaji", url: "https://github.com/greyart93" }],
  creator: "Saud Mullaji",
  keywords: ["tickets", "support", "dashboard", "nextjs", "prisma", "zustand"],
  openGraph: {
    title: "GeTiC - Support Ticket Dashboard",
    description: "A modern, efficient support ticket management dashboard.",
    url: "https://github.com/greyart93/getic",
    siteName: "GeTiC",
    images: [
      {
        url: "/favicon.ico", 
        width: 10,
        height: 10,
        alt: "GeTiC Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GeTiC - Support Ticket Dashboard",
    description: "A modern, efficient support ticket management dashboard.",
    images: ["icon.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },        // Fallback for all browsers
      { url: "/favicon.svg", type: "image/svg+xml" } // Modern browsers
    ],
    apple: "/apple-touch-icon.png", // For iPhones/iPads
  },
}

//
// ─── ROOT LAYOUT ──────────────────────────────────────────────────────
// Wraps every route. Provides: Google fonts as CSS variables (IBM Plex Sans
// body / Playwrite accents), the dark/light ThemeProvider, and the single
// <Toaster /> that every toast.add() in the app renders into.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      // 👇 Required by next-themes: suppresses the React hydration warning
      //    caused by the theme class being injected before hydration.
      suppressHydrationWarning={true}
      className={cn("antialiased", ibmPlexSans.variable, playwriteIn.variable)}
    >
      <body>

        <ThemeProvider>
          {children}</ThemeProvider>
          {/* 👇 One global toast portal (see components/ui/toast.tsx) */}
          <Toaster />
      </body>
    </html>
  )
}
