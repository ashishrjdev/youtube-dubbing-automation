import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { APP_NAME } from "@/lib/brand";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Create dubbed versions of videos with AI transcription, rewriting, and voice generation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions (ad blockers, Grammarly, password managers) inject
    // attributes on <html>/<body> before hydration; this only silences
    // attribute mismatches on these two elements, not their children.
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthSessionSync />
        {children}
      </body>
    </html>
  );
}
