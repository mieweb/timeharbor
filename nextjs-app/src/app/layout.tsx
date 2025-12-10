import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import MainNav from "@/components/MainNav";
import { getActiveSession } from "@/lib/data";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TimeHarbor - Your Personal Time Tracking Assistant",
  description: "Track, reflect on, and selectively share how you spend your time.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { activeEvent, userTeams } = await getActiveSession();

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${inter.className} bg-base-100 min-h-screen flex flex-col`}>
        <MainNav user={user} activeEvent={activeEvent} userTeams={userTeams} />

        <main className="container mx-auto px-4 pb-20 flex-grow max-w-7xl">
          {children}
        </main>

        <footer className="footer p-4 bg-base-200 text-base-content border-t border-base-300 mt-auto">
          <aside className="text-center md:text-left w-full">
            <p className="text-sm">&copy; 2025 TimeHarbor - Your Personal Time Tracking Assistant</p>
          </aside>
        </footer>
      </body>
    </html>
  );
}
