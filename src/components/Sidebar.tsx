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
import { AkbsLogo } from './AkbsLogo';
import broilerHeroImg from '../assets/images/broiler_farmer_hero_1790287489096.jpg';

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
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[19px] h-[19px]" /> },
        { id: 'registrations', label: 'Registration Modules', icon: <UserRoundPlus className="w-[19px] h-[19px]" />, badge: '2' }
      ]
    },
    {
      label: 'CRM & Relationships',
      items: [
        { id: 'leads', label: 'Leads', icon: <Users className="w-[19px] h-[19px]" /> },
        { id: 'followups', label: 'Follow-ups', icon: <PhoneCall className="w-[19px] h-[19px]" /> },
        { id: 'customers', label: 'Customers', icon: <UserCheck className="w-[19px] h-[19px]" /> },
        { id: 'partners', label: 'Partners', icon: <Handshake className="w-[19px] h-[19px]" /> }
      ]
    },
    {
      label: 'Operations',
      items: [
        { id: 'manager-portal', label: 'Site Visits', icon: <ClipboardCheck className="w-[19px] h-[19px]" /> },
        { id: 'proposals', label: 'DPR & Proposals', icon: <FileText className="w-[19px] h-[19px]" /> },
        { id: 'loans', label: 'Loan & Financing', icon: <BadgeIndianRupee className="w-[19px] h-[19px]" /> },
        { id: 'tasks', label: 'Tasks', icon: <CalendarCheck2 className="w-[19px] h-[19px]" /> }
      ]
    },
    {
      label: 'Insights & System',
      items: [
        { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-[19px] h-[19px]" /> },
        { id: 'communication', label: 'Support & Help', icon: <HelpCircle className="w-[19px] h-[19px]" /> },
        { id: 'admin-control', label: 'Access Control', icon: <KeyRound className="w-[19px] h-[19px]" /> },
        { id: 'settings', label: 'Settings', icon: <Settings2 className="w-[19px] h-[19px]" /> }
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
        className={`fixed inset-y-0 left-0 z-50 text-white transition-all duration-300 ease-out
          lg:sticky lg:top-0 lg:h-screen lg:shrink-0
          ${isOpen
            ? 'translate-x-0 w-[300px]'
            : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0'}`}
      >
        <div className="w-[300px] h-full bg-[#031d14] border-r border-emerald-950/70 shadow-[12px_0_38px_rgba(1,25,17,0.20)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto premium-sidebar-scroll bg-[radial-gradient(circle_at_45%_15%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,#073323_0%,#04271b_35%,#031d14_100%)]">
            <div className="p-3.5 pb-4">
              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white shadow-[0_18px_38px_rgba(0,0,0,0.20)]">
                <div
                  className="absolute inset-y-0 right-0 w-[47%] bg-cover bg-center opacity-95"
                  style={{ backgroundImage: `url(${broilerHeroImg})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_47%,rgba(255,255,255,0.88)_62%,rgba(236,253,245,0.16)_100%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-[linear-gradient(155deg,transparent_0%,transparent_28%,#0a5c3e_29%,#063c2a_100%)]" />

                <button
                  onClick={() => navigate('dashboard')}
                  className="relative z-10 flex min-h-[138px] w-full items-start px-4 pt-5 text-left"
                >
                  <div className="max-w-[172px]">
                    <AkbsLogo theme="light" size="md" showTagline={false} />
                    <div className="mt-2 text-[10px] font-semibold tracking-[-0.01em] text-emerald-900/60">
                      Healthy Birds | Better Tomorrow
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleClose}
                  className="absolute right-2.5 top-2.5 z-20 lg:hidden rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="mt-4">
                {groups.map((group) => (
                  <div key={group.label} className="mb-4 last:mb-0">
                    <div className="mb-2 px-2.5 text-[10px] uppercase tracking-[0.27em] text-emerald-100/55 font-bold">
                      {group.label}
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const active = currentSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(item.id)}
                            className={`group relative w-full min-h-[46px] px-3.5 rounded-[17px] flex items-center justify-between transition-all duration-200 text-left overflow-hidden
                              ${active
                                ? 'bg-[linear-gradient(135deg,#0caf72_0%,#08724c_100%)] text-white shadow-[0_12px_28px_rgba(3,104,69,0.32)] ring-1 ring-emerald-300/15'
                                : 'text-emerald-50/82 hover:bg-white/[0.075] hover:text-white'}`}
                          >
                            {active && (
                              <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-emerald-200 shadow-[0_0_14px_rgba(167,243,208,0.8)]" />
                            )}

                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`${active ? 'text-white' : 'text-emerald-200/88 group-hover:text-emerald-100'} shrink-0`}>
                                {item.icon}
                              </span>
                              <span className="truncate text-[13.5px] font-semibold tracking-[-0.018em]">
                                {item.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.badge && (
                                <span className={`min-w-5 rounded-lg px-1.5 py-0.5 text-center text-[9.5px] font-bold
                                  ${active ? 'bg-white/18 text-white' : 'bg-emerald-300/10 text-emerald-200'}`}>
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight
                                className={`w-3.5 h-3.5 transition-transform duration-200
                                  ${active ? 'text-white' : 'text-emerald-100/48 group-hover:translate-x-0.5 group-hover:text-emerald-100/80'}`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mt-5 relative overflow-hidden rounded-[26px] border border-emerald-300/12 shadow-[0_18px_34px_rgba(0,0,0,0.28)]">
                <img
                  src={broilerHeroImg}
                  alt="Healthy Farmers Healthy India"
                  className="h-[270px] w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,42,29,0.08)_0%,rgba(3,42,29,0.14)_28%,rgba(2,31,22,0.88)_72%,rgba(2,24,17,0.98)_100%)]" />
                <div className="absolute left-4 top-4 text-emerald-200/80">
                  <Leaf className="w-6 h-6" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="font-['Caveat',cursive] text-[31px] leading-[0.88] font-bold tracking-wide text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.70)]">
                    Healthy Farmers
                  </div>
                  <div className="font-['Caveat',cursive] text-[31px] leading-none font-bold tracking-wide text-amber-300 drop-shadow-[0_3px_8px_rgba(0,0,0,0.70)]">
                    Healthy India
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/18 bg-[#06291d]/72 px-3.5 py-3 backdrop-blur-md shadow-lg">
                    <p className="text-[11px] leading-relaxed font-medium text-emerald-50/95">
                      “Every Follow-up Brings a Farmer Closer to a Better Tomorrow”
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,74,52,0.72),rgba(5,42,29,0.92))] p-3.5 shadow-[0_14px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <button
                  onClick={() => navigate('admin-control')}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[linear-gradient(135deg,#19d592,#0da56f)] flex items-center justify-center text-sm font-black text-white shadow-[0_8px_20px_rgba(7,142,95,0.35)] shrink-0">
                      SA
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-white truncate">Super Admin</div>
                      <div className="text-[10.5px] text-emerald-100/58 truncate">CRM Management Console</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-100/65 shrink-0" />
                </button>

                <div className="my-3 h-px bg-white/10" />

                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-xl px-1 py-1.5 text-left text-white/90 transition-colors hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <LogOut className="w-[18px] h-[18px] text-emerald-100/82" />
                    <span className="text-[12.5px] font-semibold">Logout</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-100/55" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
