import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LocaleProvider } from "@/components/providers/locale-provider"
import { AuthProvider } from "@/lib/providers/auth-provider"
import RoleRedirect from "@/components/RoleRedirect"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Healthcare Management Portal | Professional Medical Care System",
  description: "Comprehensive healthcare management system for doctors, patients, and medical professionals. Manage appointments, patient records, analytics, and healthcare services.",
  keywords: "healthcare management, medical portal, doctor dashboard, patient portal, appointment booking, medical records, healthcare analytics",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <LocaleProvider>
            <AuthProvider>
              <LocaleWrapper>
                {children}
              </LocaleWrapper>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

// Wrapper component to handle RTL/LTR direction
function LocaleWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LocaleDirectionProvider>
      {children}
    </LocaleDirectionProvider>
  )
}

// Client component to handle direction changes
function LocaleDirectionProvider({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') {
    return <div>{children}</div>
  }

  // This will be handled by the LocaleProvider on the client side
  return <div className="locale-wrapper">{children}</div>
}
