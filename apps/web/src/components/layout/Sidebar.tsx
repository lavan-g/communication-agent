import { NavLink } from 'react-router-dom';
import { Home, Mic, BookOpen, User, Sparkles } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/session', icon: Mic, label: 'Live Session' },
    { to: '/stories', icon: BookOpen, label: 'Story Bank' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="w-[220px] h-screen bg-gray-950 border-r border-gray-900 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        <span className="font-semibold text-lg tracking-wide text-gray-100">Coach</span>
      </div>

      <nav className="flex-1 mt-6 px-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-900 text-blue-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 text-xs text-gray-600 border-t border-gray-900">
        v0.1.0 · Phase 1
      </div>
    </div>
  );
}
