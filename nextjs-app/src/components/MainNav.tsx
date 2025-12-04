'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";
import { NotificationBell } from "./NotificationBell";

interface MainNavProps {
  user: any;
}

export default function MainNav({ user }: MainNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Also set dark class for Tailwind dark mode
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="navbar bg-primary text-primary-content shadow mb-4 md:mb-6 sticky top-0 z-50">
      <div className="navbar-start">
        <Link href="/" className="text-xl md:text-2xl font-bold px-2 md:px-4">
          TimeHarbor
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="navbar-center hidden lg:flex">
        {user && (
          <nav className="flex gap-1">
            <Link href="/" className="btn btn-ghost btn-sm hover:bg-primary-focus">Home</Link>
            <Link href="/teams" className="btn btn-ghost btn-sm hover:bg-primary-focus">Teams</Link>
            <Link href="/tickets" className="btn btn-ghost btn-sm hover:bg-primary-focus">Tickets</Link>
            <Link href="/calendar" className="btn btn-ghost btn-sm hover:bg-primary-focus">Calendar</Link>
            <Link href="/admin" className="btn btn-ghost btn-sm hover:bg-primary-focus">Admin</Link>
          </nav>
        )}
      </div>

      <div className="navbar-end gap-2">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="btn btn-ghost btn-circle btn-sm"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {user ? (
          <>
            {/* Notification Bell - hidden on very small screens */}
            <div className="hidden sm:block">
              <NotificationBell />
            </div>
            
            {/* Desktop Logout */}
            <div className="hidden lg:block">
              <LogoutButton />
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="btn btn-ghost btn-circle lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm">Login</Link>
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && user && (
        <div className="absolute top-full left-0 right-0 bg-primary shadow-lg lg:hidden">
          <nav className="flex flex-col p-2">
            <Link 
              href="/" 
              className="btn btn-ghost justify-start hover:bg-primary-focus"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/teams" 
              className="btn btn-ghost justify-start hover:bg-primary-focus"
              onClick={() => setIsMenuOpen(false)}
            >
              Teams
            </Link>
            <Link 
              href="/tickets" 
              className="btn btn-ghost justify-start hover:bg-primary-focus"
              onClick={() => setIsMenuOpen(false)}
            >
              Tickets
            </Link>
            <Link 
              href="/calendar" 
              className="btn btn-ghost justify-start hover:bg-primary-focus"
              onClick={() => setIsMenuOpen(false)}
            >
              Calendar
            </Link>
            <Link 
              href="/admin" 
              className="btn btn-ghost justify-start hover:bg-primary-focus"
              onClick={() => setIsMenuOpen(false)}
            >
              Admin Review
            </Link>
            
            {/* Mobile Notification Bell */}
            <div className="sm:hidden p-2 border-t border-primary-focus mt-2">
              <NotificationBell />
            </div>
            
            <div className="border-t border-primary-focus mt-2 pt-2">
              <LogoutButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
