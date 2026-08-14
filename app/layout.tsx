import { IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
// import { ModeToggle } from "@/components/mode-toggle";
// import { ThemeToggle } from "@/components/ui/toggle-theme";
import { Toaster } from "@/components/ui/toast"
import { Metadata } from "next";

const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-sans', preload:false })

export const metadata: Metadata = {
  title: {
    default: "GeTiC - Support Ticket Dashboard",
    template: "%s | GeTiC",
  },
  description: "A modern, efficient support ticket management dashboard built with Next.js.",
  metadataBase: new URL("https://github.com/greyart93/getic"), // Change to your actual domain
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={cn("antialiased", ibmPlexSans.variable)}
    >
      <body>

        <ThemeProvider>
          {children}</ThemeProvider>
          <Toaster />
      </body>
    </html>
  )
}
