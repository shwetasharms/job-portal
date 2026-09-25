import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { ResumeHandoffProvider } from "@/components/ResumeHandoff";
import { SITE_NAME } from "@/lib/format";


export const metadata: Metadata = {
  title: { default: `${SITE_NAME} – Find your next job`, template: `%s | ${SITE_NAME}` },
  description: "Browse open roles, check how well your resume matches a job description, and apply in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ResumeHandoffProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </footer>
        </ResumeHandoffProvider>
      </body>
    </html>
  );
}
