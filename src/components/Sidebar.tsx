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
  Building2
} from 'lucide-react';
import { NavigationSection, PortalRole } from '../types';
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
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'registrations', label: 'Registration Modules', icon: <UserRoundPlus className="w-4 h-4" />, badge: '2' }
      ]
    },
    {
      label: 'CRM & Relationships',
      items: [
        { id: 'leads', label: 'Leads', icon: <Users className="w-4 h-4" /> },
        { id: 'followups', label: 'Follow-ups', icon: <PhoneCall className="w-4 h-4" /> },
        { id: 'customers', label: 'Customers', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'partners', label: 'Partners', icon: <Handshake className="w-4 h-4" /> }
      ]
    },
    {
      label: 'Operations',
      items: [
        { id: 'manager-portal', label: 'Site Visits', icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: 'proposals', label: 'DPR & Proposals', icon: <FileText className="w-4 h-4" /> },
        { id: 'loans', label: 'Loan & Financing', icon: <BadgeIndianRupee className="w-4 h-4" /> },
        { id: 'tasks', label: 'Tasks', icon: <CalendarCheck2 className="w-4 h-4" /> }
      ]
    },
    {
      label: 'Insights & System',
      items: [
        { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'communication', label: 'Support & Help', icon: <HelpCircle className="w-4 h-4" /> },
        { id: 'admin-control', label: 'Access Control', icon: <KeyRound className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings2 className="w-4 h-4" /> }
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#082719] text-white transition-all duration-200 border-r border-emerald-950/60 shadow-xl
        lg:sticky lg:top-0 lg:h-screen lg:shrink-0
        ${isOpen ? 'translate-x-0 w-[272px]' : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0'}`}>
        <div className="w-[272px] h-full flex flex-col">
          <div className="h-[76px] px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <button onClick={() => onSelectSection('dashboard')} className="text-left">
              <AkbsLogo theme="light" size="md" showTagline={false} />
            </button>
            <button onClick={handleClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 pt-4 pb-3">
            <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/30 px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-300/70 font-bold">Admin CRM</div>
                  <div className="text-sm font-bold text-white">AKBS Poultry Farming</div>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-emerald-200/45 font-bold">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = currentSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectSection(item.id);
                          if (window.innerWidth < 1024) handleClose();
                        }}
                        className={`w-full h-10 px-3 rounded-xl flex items-center justify-between transition-all text-left
                          ${active
                            ? 'bg-white text-[#082719] shadow-sm font-bold'
                            : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={active ? 'text-emerald-800' : 'text-emerald-300/80'}>{item.icon}</span>
                          <span className="text-[13px]">{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-400/15 text-emerald-200'}`}>
                            {item.badge}
                          </span>
                        ) : active ? (
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-[#052015] flex items-center justify-center font-black text-xs">SA</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">Super Admin</div>
                <div className="text-[10px] text-emerald-200/60 truncate">CRM Management Console</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
