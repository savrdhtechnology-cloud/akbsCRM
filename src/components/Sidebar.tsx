import React from 'react';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  UserCheck,
  ClipboardCheck,
  FileText,
  BadgeIndianRupee,
  CalendarCheck2,
  BarChart3,
  HelpCircle,
  X,
  Handshake,
  UserRoundPlus,
  Settings2,
  KeyRound,
  ChevronRight,
  LogOut,
  Leaf
} from 'lucide-react';
import { NavigationSection, PortalRole } from '../types';
import broilerHeroImg from '../assets/images/broiler_farmer_hero_1790287489096.jpg';
import { AkbsLogo } from './AkbsLogo';

interface SidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  isOpen: boolean;
  currentRole?: PortalRole;
  onSelectRole?: (role: PortalRole) => void;
  onClose?: () => void;
  onCloseMobile?: () => void;
}

type NavItem = {
  id: NavigationSection;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpen,
  onClose,
  onCloseMobile
}) => {
  const handleClose = onClose || onCloseMobile || (() => {});

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { id: 'registrations', label: 'Registration Modules', icon: <UserRoundPlus className="w-[18px] h-[18px]" />, badge: '2' }
      ]
    },
    {
      label: 'CRM & Relationships',
      items: [
        { id: 'leads', label: 'Leads', icon: <Users className="w-[18px] h-[18px]" /> },
        { id: 'followups', label: 'Follow-ups', icon: <PhoneCall className="w-[18px] h-[18px]" /> },
        { id: 'customers', label: 'Customers', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        { id: 'partners', label: 'Partners', icon: <Handshake className="w-[18px] h-[18px]" /> }
      ]
    },
    {
      label: 'Operations',
      items: [
        { id: 'manager-portal', label: 'Site Visits', icon: <ClipboardCheck className="w-[18px] h-[18px]" /> },
        { id: 'proposals', label: 'DPR & Proposals', icon: <FileText className="w-[18px] h-[18px]" /> },
        { id: 'loans', label: 'Loan & Financing', icon: <BadgeIndianRupee className="w-[18px] h-[18px]" /> },
        { id: 'tasks', label: 'Tasks', icon: <CalendarCheck2 className="w-[18px] h-[18px]" /> }
      ]
    },
    {
      label: 'Insights & System',
      items: [
        { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
        { id: 'communication', label: 'Support & Help', icon: <HelpCircle className="w-[18px] h-[18px]" /> },
        { id: 'admin-control', label: 'Access Control', icon: <KeyRound className="w-[18px] h-[18px]" /> },
        { id: 'settings', label: 'Settings', icon: <Settings2 className="w-[18px] h-[18px]" /> }
      ]
    }
  ];

  const navigate = (section: NavigationSection) => {
    onSelectSection(section);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      handleClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/55 z-40 lg:hidden backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      <aside
        className={`crm-sidebar fixed inset-y-0 left-0 z-50 text-white transition-all duration-300 ease-out
          lg:sticky lg:top-0 lg:h-screen lg:shrink-0
          ${isOpen
            ? 'translate-x-0 w-[248px] xl:w-[256px]'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'}`}
      >
        <div className="w-[248px] xl:w-[256px] h-full bg-[#031d14] border-r border-emerald-950/70 shadow-[10px_0_28px_rgba(1,25,17,0.16)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto premium-sidebar-scroll bg-[radial-gradient(circle_at_45%_12%,rgba(16,185,129,0.10),transparent_22%),linear-gradient(180deg,#073323_0%,#04271b_38%,#031d14_100%)]">
            <div className="p-3 pb-3.5">
              <div className="sidebar-brand">
                <button type="button" onClick={() => navigate('dashboard')} className="sidebar-brand-link" aria-label="AKBS Poultry Farming — open dashboard">
                  <AkbsLogo theme="light" size="md" showTagline />
                </button>
                <button type="button" onClick={handleClose} className="sidebar-close lg:hidden" aria-label="Close sidebar">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav aria-label="Main navigation" className="mt-5">
                {groups.map((group) => (
                  <div key={group.label} className="mb-3 last:mb-0">
                    <div className="mb-1.5 px-2.5 text-[10px] uppercase tracking-[0.16em] text-emerald-100/52 font-bold">
                      {group.label}
                    </div>

                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = currentSection === item.id;
                        return (
                          <button
                            key={item.id}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => navigate(item.id)}
                            className={`group relative w-full min-h-[40px] px-3 rounded-xl flex items-center justify-between transition-all duration-200 text-left overflow-hidden
                              ${active
                                ? 'bg-[linear-gradient(135deg,#0caf72_0%,#08724c_100%)] text-white shadow-[0_9px_20px_rgba(3,104,69,0.25)] ring-1 ring-emerald-300/15'
                                : 'text-emerald-50/82 hover:bg-white/[0.07] hover:text-white'}`}
                          >
                            {active && (
                              <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-emerald-200 shadow-[0_0_12px_rgba(167,243,208,0.7)]" />
                            )}

                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className={`${active ? 'text-white' : 'text-emerald-200/88 group-hover:text-emerald-100'} shrink-0`}>
                                {item.icon}
                              </span>
                              <span className="truncate text-[13px] font-medium tracking-normal">
                                {item.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.badge && (
                                <span className={`min-w-5 rounded-lg px-1.5 py-0.5 text-center text-[9px] font-bold
                                  ${active ? 'bg-white/18 text-white' : 'bg-emerald-300/10 text-emerald-200'}`}>
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight
                                className={`w-3.5 h-3.5 transition-transform duration-200
                                  ${active ? 'text-white' : 'text-emerald-100/42 group-hover:translate-x-0.5 group-hover:text-emerald-100/75'}`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Compact lower brand image */}
              <div className="mt-4 relative overflow-hidden rounded-[22px] border border-emerald-300/10 shadow-[0_14px_28px_rgba(0,0,0,0.24)]">
                <img
                  src={broilerHeroImg}
                  alt="Healthy Farmers Healthy India"
                  className="h-[186px] w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,42,29,0.04)_0%,rgba(2,31,22,0.42)_48%,rgba(2,24,17,0.96)_100%)]" />
                <div className="absolute left-3.5 top-3 text-emerald-100/72">
                  <Leaf className="w-5 h-5" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <div className="font-display text-[18px] leading-[0.88] font-bold tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">
                    Healthy Farmers
                  </div>
                  <div className="font-display text-[18px] leading-none font-bold tracking-wide text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">
                    Healthy India
                  </div>
                  <div className="mt-2 rounded-xl border border-white/16 bg-[#06291d]/72 px-3 py-2 backdrop-blur-md">
                    <p className="text-[9.5px] leading-relaxed font-medium text-emerald-50/92">
                      “Every Follow-up Brings a Farmer Closer to a Better Tomorrow”
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact admin profile */}
              <div className="mt-3 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,74,52,0.70),rgba(5,42,29,0.92))] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <button
                  onClick={() => navigate('admin-control')}
                  className="w-full flex items-center justify-between gap-2.5 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#19d592,#0da56f)] flex items-center justify-center text-[11px] font-black text-white shadow-[0_7px_16px_rgba(7,142,95,0.30)] shrink-0">
                      SA
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold text-white truncate">Super Admin</div>
                      <div className="text-[9.5px] text-emerald-100/55 truncate">CRM Management Console</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-100/58 shrink-0" />
                </button>

                <div className="my-2.5 h-px bg-white/10" />

                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-xl px-0.5 py-1 text-left text-white/88 transition-colors hover:text-white"
                >
                  <span className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-emerald-100/78" />
                    <span className="text-[11px] font-semibold">Logout</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-100/50" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
