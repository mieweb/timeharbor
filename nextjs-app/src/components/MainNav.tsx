'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import { NotificationBell } from "./NotificationBell";
import TeamSelector from "./TeamSelector";
import { startClock, stopClock } from '@/lib/actions/clock';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { useClockStore } from '@/store/useClockStore';
import { useAuthStore } from '@/store/useAuthStore';

interface MainNavProps {
  user: any;
  activeEvent?: any;
  userTeams?: any[];
}

export default function MainNav({ user, activeEvent, userTeams }: MainNavProps) {
  const { isMenuOpen, toggleMenu, theme, setTheme } = useUIStore();
  const { elapsedTime, updateElapsedTime } = useClockStore();
  const { logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydrate theme from store to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      updateElapsedTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateElapsedTime]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const handleClockIn = async () => {
    if (userTeams && userTeams.length > 0) {
      try {
        // Support both team_id (legacy) and teamId (new format)
        const teamId = userTeams[0].teamId || userTeams[0].team_id;
        await startClock(teamId);
        router.refresh();
      } catch (error) {
        console.error('Failed to clock in:', error);
      }
    } else {
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
    <header className="navbar bg-th-dark text-white shadow mb-6 sticky top-0 z-50 pl-1 pr-2 md:px-6">
      <div className="flex-1 flex items-center gap-2 md:gap-8 min-w-0">
        <Link href="/" className="text-lg md:text-2xl font-bold tracking-tight truncate mr-2">
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

      <div className="flex-none flex items-center gap-2">
        {user && (
            <>
                <div className="bg-th-darker px-4 py-2 rounded-md font-mono text-th-accent font-bold hidden sm:block">
                    {elapsedTime}
                </div>
                
                {activeEvent ? (
                    <button onClick={handleClockOut} className="hidden md:block btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none whitespace-nowrap">
                    Clock Out
                    </button>
                ) : (
                    <button onClick={handleClockIn} className="hidden md:block btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none whitespace-nowrap">
                    Clock In
                    </button>
                )}
            </>
        )}

        {/* Notification Bell */}
        {user && (
          <div className="block">
            <NotificationBell />
          </div>
        )}

        {user ? (
          <>
            {/* Team Selector */}
            <div className="block mr-2">
              <TeamSelector userTeams={userTeams || []} />
            </div>
            
            {/* Profile Dropdown */}
            <div className="dropdown dropdown-end hidden lg:block">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
                <div className="indicator">
                  <i className="fa-solid fa-user text-lg"></i>
                </div>
              </div>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 text-base-content">
                <li>
                  <button onClick={() => logout()} className="w-full text-left">Logout</button>
                </li>
              </ul>
            </div>

            {/* Mobile Logout Button */}
            <button 
              className="btn btn-ghost btn-circle lg:hidden text-error"
              onClick={() => logout()}
              aria-label="Logout"
            >
              <i className="fa-solid fa-right-from-bracket text-lg"></i>
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm">Login</Link>
        )}
      </div>


    </header>
  );
}
