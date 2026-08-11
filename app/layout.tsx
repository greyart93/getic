import { Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeToggle } from "@/components/ui/toggle-theme";
import { Toaster } from "@/components/ui/toast"

const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={cn("antialiased", fontMono.variable, "font-sans", ibmPlexSans.variable)}
    >
      <body>

        <ThemeProvider>
          <header className="flex justify-end p-4">
            {/* <ModeToggle /> */}
            <ThemeToggle />
          </header>
          {children}</ThemeProvider>
          <Toaster />
      </body>
    </html>
  )
}
