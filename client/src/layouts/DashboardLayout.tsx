import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Calendar, BarChart3, Users, UserRoundSearch, Settings, LogOut, Lightbulb, PanelLeftClose, PanelLeftOpen, Shield, DoorOpen, MoreHorizontal, ChevronsUpDown, Plus, MapPin, LayoutGrid, Bell, Package, Globe, Receipt } from 'lucide-react';
import logoCompact from '@/assets/logo-compact.svg';
import TrialBanner from '@/components/TrialBanner';
import { useState } from 'react';
import { isAdmin } from '@/lib/admin';
import type { User } from '@supabase/supabase-js';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Organization } from '@shared/schema';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function getNavGroups(slug: string, user?: User | null, hasMeetingRooms?: boolean, role?: string | null): NavGroup[] {
  const base = `/${slug}`;
  const isOwner = role === 'owner';

  const groups: NavGroup[] = [
    {
      label: 'Bookings',
      items: [
        { to: `${base}/calendar`, label: 'Calendar', shortLabel: 'Calendar', icon: Calendar },
        ...(hasMeetingRooms ? [{ to: `${base}/meeting-rooms`, label: 'Meeting Rooms', shortLabel: 'Rooms', icon: DoorOpen }] : []),
      ],
    },
    {
      label: 'Members',
      items: [
        { to: `${base}/members`, label: 'Members', shortLabel: 'Members', icon: UserRoundSearch },
        { to: `${base}/waiting-list`, label: 'Waiting List', shortLabel: 'Waitlist', icon: Users },
      ],
    },
    {
      label: 'Finances',
      items: [
        ...(isOwner ? [{ to: `${base}/revenue`, label: 'Revenue', shortLabel: 'Revenue', icon: BarChart3 }] : []),
        ...(isOwner ? [{ to: `${base}/expenses`, label: 'Expenses', shortLabel: 'Expenses', icon: Receipt }] : []),
        { to: `${base}/insights`, label: 'Insights', shortLabel: 'Insights', icon: Lightbulb },
      ],
    },
    {
      label: 'Settings',
      items: [
        { to: `${base}/organization`, label: 'Organization', shortLabel: 'Org', icon: Settings },
        { to: `${base}/rooms`, label: 'Rooms', shortLabel: 'Rooms', icon: LayoutGrid },
        { to: `${base}/plans`, label: 'Plans', shortLabel: 'Plans', icon: Package },
        { to: `${base}/team`, label: 'Team', shortLabel: 'Team', icon: Users },
        { to: `${base}/notifications`, label: 'Notifications', shortLabel: 'Alerts', icon: Bell },
        { to: `${base}/integrations`, label: 'Integrations', shortLabel: 'Integr.', icon: Globe },
        ...(isAdmin(user) ? [{ to: `${base}/admin`, label: 'Admin', shortLabel: 'Admin', icon: Shield }] : []),
      ],
    },
  ];

  return groups.filter((g) => g.items.length > 0);
}

function flattenGroups(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

const MOBILE_MAX = 5;

function NavLinkItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {item.label}
    </NavLink>
  );
}

function OrgSwitcher({
  currentOrg,
  organizations,
  onSwitch,
}: {
  currentOrg: Organization;
  organizations: Organization[];
  onSwitch: (org: Organization) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasMultipleOrgs = organizations.length > 1;
  const canAddLocation = !!currentOrg.groupId;

  if (!hasMultipleOrgs && !canAddLocation) {
    // Single org, no group — just show name (no dropdown)
    return (
      <div className="px-4 py-2 border-b flex items-center gap-2 min-w-0">
        {currentOrg.logoUrl ? (
          <img src={currentOrg.logoUrl} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
        ) : null}
        <p className="text-sm text-gray-500 truncate">{currentOrg.name}</p>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full px-4 py-2 border-b flex items-center gap-2 min-w-0 hover:bg-gray-50 transition-colors text-left">
          {currentOrg.logoUrl ? (
            <img src={currentOrg.logoUrl} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
          )}
          <span className="text-sm text-gray-700 truncate flex-1">{currentOrg.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1" sideOffset={4}>
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-1.5">
          Locations
        </div>
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => {
              onSwitch(org);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
              org.id === currentOrg.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="" className="h-4 w-4 rounded object-contain shrink-0" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            )}
            <span className="truncate">{org.name}</span>
          </button>
        ))}
        {canAddLocation && (
          <>
            <div className="border-t my-1" />
            <a
              href="/onboarding?add-location=true"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add location
            </a>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { currentOrg, currentRole, hasMeetingRooms, organizations, setCurrentOrg } = useOrganization();
  const navGroups = getNavGroups(currentOrg?.slug || 'app', user, hasMeetingRooms, currentRole);
  const navItems = flattenGroups(navGroups);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Mobile: show first MOBILE_MAX items; overflow goes into "More" drawer
  const primaryMobileItems = navItems.slice(0, MOBILE_MAX);
  const moreItems = navItems.slice(MOBILE_MAX);
  const hasMore = navItems.length > MOBILE_MAX;

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
          <OrgSwitcher
            currentOrg={currentOrg}
            organizations={organizations}
            onSwitch={(org) => {
              setCurrentOrg(org);
              navigate(`/${org.slug}/calendar`);
            }}
          />
        )}

        <nav className={`flex-1 p-3 overflow-y-auto ${sidebarOpen ? '' : 'px-2'}`}>
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
              {sidebarOpen && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                  {group.label}
                </p>
              )}
              {!sidebarOpen && gi > 0 && <div className="border-t my-2 mx-1" />}
              <div className="space-y-0.5">
                {group.items.map((item) => (
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
              </div>
            </div>
          ))}
        </nav>

        <div className={`p-3 border-t ${sidebarOpen ? '' : 'px-2'}`}>
          {sidebarOpen && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.user_metadata?.full_name || (currentOrg ? `${currentOrg.name} Admin` : user?.email)}
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
        <TrialBanner />
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t safe-area-bottom">
        <div className="flex items-stretch">
          {primaryMobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-0.5" />
              {item.shortLabel}
            </NavLink>
          ))}

          {hasMore && (
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button className="flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium text-gray-500">
                  <MoreHorizontal className="h-5 w-5 mb-0.5" />
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                <div className="mt-4 space-y-1">
                  {moreItems.map((item) => (
                    <NavLinkItem key={item.to} item={item} onClick={() => setDrawerOpen(false)} />
                  ))}
                  <button
                    onClick={() => { setDrawerOpen(false); handleSignOut(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Sign Out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </div>
  );
}
