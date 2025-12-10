'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";
import { NotificationBell } from "./NotificationBell";
import { startClock, stopClock } from '@/lib/actions/clock';
import { useRouter } from 'next/navigation';

interface MainNavProps {
  user: any;
  activeEvent?: any;
  userTeams?: any[];
}

export default function MainNav({ user, activeEvent, userTeams }: MainNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [elapsedTime, setElapsedTime] = useState('0:00:00');
  const router = useRouter();

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

  useEffect(() => {
    if (!activeEvent) {
      setElapsedTime('0:00:00');
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(activeEvent.start_timestamp).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeEvent]);

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

  const handleClockIn = async () => {
    if (userTeams && userTeams.length > 0) {
      try {
        await startClock(userTeams[0].team_id);
        router.refresh();
      } catch (error) {
        console.error('Failed to clock in:', error);
      }
    } else {
        // Maybe redirect to teams page if no team?
        router.push('/teams');
    }
  };

  const handleClockOut = async () => {
    if (activeEvent) {
      try {
        await stopClock(activeEvent.team_id);
        router.refresh();
      } catch (error) {
        console.error('Failed to clock out:', error);
      }
    }
  };

  return (
    <header className="navbar bg-th-dark text-white shadow mb-6 sticky top-0 z-50 px-6">
      <div className="flex-1 flex items-center gap-8">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          TimeHarbor
        </Link>
        {user && (
            <nav className="hidden md:flex gap-6 text-sm font-medium">
                <Link href="/" className="hover:text-th-accent transition-colors">Home</Link>
                <Link href="/teams" className="hover:text-th-accent transition-colors">Teams</Link>
                <Link href="/tickets" className="hover:text-th-accent transition-colors">Tickets</Link>
                <Link href="/calendar" className="hover:text-th-accent transition-colors">Calendar</Link>
                <Link href="/admin" className="hover:text-th-accent transition-colors">Admin</Link>
            </nav>
        )}
      </div>

      <div className="flex-none flex items-center gap-4">
        {user && (
            <>
                <div className="bg-th-darker px-4 py-2 rounded-md font-mono text-th-accent font-bold hidden sm:block">
                    {elapsedTime}
                </div>
                
                {activeEvent ? (
                    <button onClick={handleClockOut} className="btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none">
                    Clock Out
                    </button>
                ) : (
                    <button onClick={handleClockIn} className="btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none">
                    Clock In
                    </button>
                )}
            </>
        )}

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
        <div className="absolute top-full left-0 right-0 bg-th-dark shadow-lg lg:hidden">
          <nav className="flex flex-col p-2">
            <Link 
              href="/" 
              className="btn btn-ghost justify-start hover:text-th-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/teams" 
              className="btn btn-ghost justify-start hover:text-th-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Teams
            </Link>
            <Link 
              href="/tickets" 
              className="btn btn-ghost justify-start hover:text-th-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Tickets
            </Link>
            <Link 
              href="/calendar" 
              className="btn btn-ghost justify-start hover:text-th-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Calendar
            </Link>
            <Link 
              href="/admin" 
              className="btn btn-ghost justify-start hover:text-th-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Admin Review
            </Link>
            
            {/* Mobile Notification Bell */}
            <div className="sm:hidden p-2 border-t border-gray-700 mt-2">
              <NotificationBell />
            </div>
            
            <div className="border-t border-gray-700 mt-2 pt-2">
              <LogoutButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
