import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

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

  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${inter.className} bg-base-100 min-h-screen flex flex-col`}>
        <header className="navbar bg-primary text-primary-content shadow mb-6 sticky top-0 z-50">
          <div className="flex-1">
            <Link href="/" className="text-2xl font-bold px-4">TimeHarbor</Link>
          </div>
          <nav className="flex-none hidden md:flex gap-2">
            {user ? (
              <>
                <Link href="/" className="btn btn-ghost hover:bg-primary-focus">Home</Link>
                <Link href="/teams" className="btn btn-ghost hover:bg-primary-focus">Teams</Link>
                <Link href="/tickets" className="btn btn-ghost hover:bg-primary-focus">Tickets</Link>
                <Link href="/calendar" className="btn btn-ghost hover:bg-primary-focus">Calendar</Link>
                <Link href="/admin" className="btn btn-ghost hover:bg-primary-focus">Admin Review</Link>
                <div className="ml-2">
                  <LogoutButton />
                </div>
              </>
            ) : (
              <Link href="/login" className="btn btn-ghost">Login</Link>
            )}
          </nav>
        </header>

        <main className="container mx-auto px-4 pb-20 flex-grow">
          {children}
        </main>

        <footer className="footer p-4 bg-base-200 text-base-content border-t border-base-300 mt-auto">
          <aside>
            <p>&copy; 2025 TimeHarbor - Your Personal Time Tracking Assistant</p>
          </aside>
        </footer>
      </body>
    </html>
  );
}
