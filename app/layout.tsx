import { IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
// import { ModeToggle } from "@/components/mode-toggle";
// import { ThemeToggle } from "@/components/ui/toggle-theme";
import { Toaster } from "@/components/ui/toast"

const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-sans', preload:false })


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
