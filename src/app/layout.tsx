import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { DashboardShell } from "@/components/dashboard-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Thinktrain",
    template: "%s | Thinktrain",
  },
  description: "毎日15分、実務ケースで構造化思考を鍛えるパーソナルトレーナー",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <DashboardShell>{children}</DashboardShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
