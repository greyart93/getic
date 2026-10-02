import { IBM_Plex_Sans, Playwrite_IN, Manrope, Instrument_Serif } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
// import { ModeToggle } from "@/components/mode-toggle";
// import { ThemeToggle } from "@/components/ui/toggle-theme";
import { Toaster } from "@/components/ui/toast"
import { Metadata } from "next";

const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-sans', preload:false })
// Playwrite has no preloadeable subsets, so Next never emits <link
// rel=preload> for it (it can't trigger unused-preload warnings).
const playwriteIn = Playwrite_IN({ 
  weight: ['100', '200', '300', '400'], 
  variable: '--font-playwrite', 
})

// >> Landing-page type system (portfolio-matched): Manrope for UI text,
//    Instrument Serif for the italic accent words inside headings.
//    Both preload:false - they are only rendered on the landing/auth pages,
//    so a global preload would just produce unused-preload warnings on
//    /tickets, /dashboard etc.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', preload: false })
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument',
  preload: false,
})

export const metadata: Metadata = {
  title: {
    default: "Getic - Support Ticket Dashboard",
    template: "%s | Getic",
  },
  description: "A modern, efficient support ticket management dashboard built with Next.js.",
  metadataBase: new URL("https://github.com/greyart93/getic"), 
  authors: [{ name: "Saud Mullaji", url: "https://github.com/greyart93" }],
  creator: "Saud Mullaji",
  keywords: ["tickets", "support", "dashboard", "nextjs", "prisma", "zustand"],
  openGraph: {
    title: "Getic - Support Ticket Dashboard",
    description: "A modern, efficient support ticket management dashboard.",
    url: "https://github.com/greyart93/getic",
    siteName: "Getic",
    images: [
      {
        url: "/favicon.ico", 
        width: 10,
        height: 10,
        alt: "Getic Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Getic - Support Ticket Dashboard",
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
      className={cn("antialiased", ibmPlexSans.variable, playwriteIn.variable, manrope.variable, instrumentSerif.variable)}
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
