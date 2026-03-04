import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Calendar, BarChart3, Users, Settings, LogOut, Lightbulb, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import logoCompact from '@/assets/logo-compact.svg';
import { useState } from 'react';

const navItems = [
  { to: '/app/calendar', label: 'Calendar', shortLabel: 'Calendar', icon: Calendar },
  { to: '/app/insights', label: 'Insights', shortLabel: 'Insights', icon: Lightbulb },
  { to: '/app/revenue', label: 'Revenue', shortLabel: 'Revenue', icon: BarChart3 },
  { to: '/app/waiting-list', label: 'Waiting List', shortLabel: 'Waitlist', icon: Users },
  { to: '/app/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-white border-r transition-all duration-200 ${
          sidebarOpen ? 'w-48' : 'w-16'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <img src={logoCompact} alt="OhMyDesk" className="h-8 shrink-0" />
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-gray-600 mx-auto"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          )}
        </div>

        {sidebarOpen && currentOrg && (
          <div className="px-4 py-2 border-b">
            <p className="text-sm text-gray-500 truncate">{currentOrg.name}</p>
          </div>
        )}

        <nav className={`flex-1 p-3 space-y-1 ${sidebarOpen ? '' : 'px-2'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={sidebarOpen ? undefined : item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 ${sidebarOpen ? 'px-3' : 'justify-center px-0'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`p-3 border-t ${sidebarOpen ? '' : 'px-2'}`}>
          {sidebarOpen && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            title={sidebarOpen ? undefined : 'Sign Out'}
            className={`flex items-center gap-3 w-full ${sidebarOpen ? 'px-3' : 'justify-center px-0'} py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t safe-area-bottom">
        <div className="flex items-stretch">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-0.5" />
              {item.shortLabel}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
