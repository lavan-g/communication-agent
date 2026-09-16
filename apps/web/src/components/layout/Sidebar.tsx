import { NavLink } from 'react-router-dom';
import { Home, Mic, BookOpen, User } from 'lucide-react';

// Voxa brand icon — speech bubble + waveform
function VoxaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path
        d="M5 6C5 4.9 5.9 4 7 4h18c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H12l-4 4v-4H7c-1.1 0-2-.9-2-2V6z"
        stroke="url(#vg)"
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M8 13 Q10 9 12 13 Q13 16 14 11 Q15 6 16 13 Q17 18 18 11 Q19 6 20 13 Q22 17 24 13"
        stroke="url(#vg)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/session', icon: Mic, label: 'Live Session' },
    { to: '/stories', icon: BookOpen, label: 'Story Bank' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="w-[220px] h-screen bg-gray-950 border-r border-gray-900 flex flex-col">
      {/* Brand header */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-gray-900 border border-gray-800 p-1.5 rounded-lg flex items-center justify-center">
          <VoxaIcon />
        </div>
        <span className="font-semibold text-lg tracking-wide bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Voxa
        </span>
      </div>

      <nav className="flex-1 mt-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-900 text-violet-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 text-xs text-gray-600 border-t border-gray-900">
        Voxa v0.1.0 · Phase 1
      </div>
    </div>
  );
}
