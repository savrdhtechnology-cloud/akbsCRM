import React from 'react';
import {
  Home,
  Users,
  PhoneCall,
  UserCheck,
  ClipboardCheck,
  FileText,
  BadgeIndianRupee,
  CalendarCheck2,
  BarChart3,
  BookOpen,
  HelpCircle,
  X,
  Sparkles,
  Briefcase,
  HardHat,
  Truck,
  KeyRound,
  Layers
} from 'lucide-react';
import { NavigationSection, PortalRole } from '../types';
import broilerHeroImg from '../assets/images/broiler_farmer_hero_1790287489096.jpg';
import amitKumarImg from '../assets/images/amit_kumar_profile_1790287530967.jpg';
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

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpen,
  currentRole = 'admin',
  onSelectRole,
  onClose,
  onCloseMobile
}) => {
  const handleClose = onClose || onCloseMobile || (() => {});

  // Primary navigation items directly matching the reference screenshot (Image 2)
  const menuItems = [
    {
      id: 'dashboard' as NavigationSection,
      label: 'Dashboard',
      icon: <Home className="w-4 h-4 stroke-[2.2]" />,
      badge: undefined
    },
    {
      id: 'leads' as NavigationSection,
      label: 'My Leads',
      icon: <Users className="w-4 h-4 stroke-[2]" />,
      badge: '2'
    },
    {
      id: 'followups' as NavigationSection,
      label: 'Follow-ups',
      icon: <PhoneCall className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    },
    {
      id: 'customers' as NavigationSection,
      label: 'Customers',
      icon: <UserCheck className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    },
    {
      id: 'manager-portal' as NavigationSection,
      label: 'Site Visits',
      icon: <ClipboardCheck className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    },
    {
      id: 'proposals' as NavigationSection,
      label: 'DPR & Proposals',
      icon: <FileText className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    },
    {
      id: 'loans' as NavigationSection,
      label: 'Loan & Financing',
      icon: <BadgeIndianRupee className="w-4 h-4 stroke-[2.2]" />,
      badge: undefined
    },
    {
      id: 'tasks' as NavigationSection,
      label: 'Tasks',
      icon: <CalendarCheck2 className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    },
    {
      id: 'reports' as NavigationSection,
      label: 'Reports',
      icon: <BarChart3 className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    },
    {
      id: 'customer-portal' as NavigationSection,
      label: 'Knowledge Base',
      icon: <BookOpen className="w-4 h-4 stroke-[2]" />,
      badge: 'Portal'
    },
    {
      id: 'communication' as NavigationSection,
      label: 'Support & Help',
      icon: <HelpCircle className="w-4 h-4 stroke-[2]" />,
      badge: undefined
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={handleClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 sm:w-68 bg-[#051a10] text-slate-100 flex flex-col justify-between transition-all duration-200 ease-in-out border-r border-[#123826] shadow-2xl
        lg:static lg:inset-auto lg:z-10 lg:h-screen lg:sticky lg:top-0 lg:shrink-0
        ${isOpen 
          ? 'translate-x-0 w-64 sm:w-68' 
          : '-translate-x-full lg:w-0 lg:border-r-0 lg:overflow-hidden'
        }
      `}>
        <div className="w-64 sm:w-68 flex flex-col h-full justify-between min-h-0 bg-[#061d12]">
          
          {/* Top White Header Bar with Rooster Logo (Exactly matching reference Image 2) */}
          <div className="bg-white px-3.5 py-3 flex items-center justify-between border-b border-slate-200/90 shrink-0 shadow-xs">
            <div 
              onClick={() => { onSelectSection('dashboard'); handleClose(); }}
              className="flex items-center cursor-pointer group"
            >
              <AkbsLogo theme="light" size="md" showTagline={true} />
            </div>

            <button 
              onClick={handleClose}
              className="lg:hidden text-slate-400 hover:text-slate-800 p-1 rounded-md"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Role Switcher Banner (Subtle & Clean) */}
          <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-[11px] text-emerald-300/80">
            <div className="flex items-center gap-1.5 font-semibold font-['Outfit',sans-serif]">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>ACTIVE ROLE:</span>
            </div>
            <div className="flex items-center gap-1">
              {(['admin', 'manager', 'employee', 'partner'] as PortalRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    if (onSelectRole) onSelectRole(r);
                    if (r === 'admin') onSelectSection('dashboard');
                    else if (r === 'manager') onSelectSection('manager-portal');
                    else if (r === 'employee') onSelectSection('employee-portal');
                    else if (r === 'partner') onSelectSection('partner-portal');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] uppercase font-bold tracking-wider transition-colors ${
                    currentRole === r
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                  title={`Switch to ${r} role`}
                >
                  {r.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links matching Image 2 */}
          <div className="flex-1 overflow-y-auto py-1 px-3 space-y-1 custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = currentSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    handleClose();
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all text-left font-['Outfit',sans-serif] ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#0d4a2d] to-[#125836] text-white shadow-md font-bold ring-1 ring-emerald-400/30' 
                        : 'text-emerald-100/85 hover:bg-[#0c2f1f] hover:text-white font-medium'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${isActive ? 'text-white' : 'text-emerald-300/80'} shrink-0`}>
                      {item.icon}
                    </span>
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Left Panel Matching Reference Image 2 */}
          <div className="p-3 border-t border-[#123826] bg-[#051a10] shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-emerald-900/60 group">
              {/* White Broiler Chicken with Red Comb Hero Image */}
              <img 
                src={broilerHeroImg} 
                alt="Healthy Farmers Healthy India" 
                className="w-full h-72 object-cover object-top filter brightness-[0.92] group-hover:scale-105 transition-transform duration-700"
              />

              {/* Gradient Overlay for Text Visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#04160c] via-[#04160c]/40 to-transparent flex flex-col justify-end p-3 text-center">
                
                {/* Handwritten Cursive Script matching Image 2 */}
                <div className="mb-2">
                  <div className="font-['Caveat',cursive] text-2xl sm:text-[27px] font-bold text-white tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                    Healthy Farmers
                  </div>
                  <div className="font-['Caveat',cursive] text-2xl sm:text-[27px] font-bold text-white tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] -mt-1">
                    Healthy India
                  </div>
                </div>

                {/* Frosted Glass Pill Capsule matching Image 2 */}
                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl py-2 px-2.5 mb-2.5 shadow-lg">
                  <p className="text-[10px] sm:text-[10.5px] font-medium text-emerald-100/95 leading-tight font-['Outfit',sans-serif]">
                    "Every Follow-up<br />Brings a Farmer Closer<br />to a Better Tomorrow"
                  </p>
                </div>

                {/* Profile row matching Image 2 */}
                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <img
                      src={amitKumarImg}
                      alt="Amit Kumar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-emerald-400 shadow-sm shrink-0"
                    />
                    <div>
                      <div className="font-['Outfit',sans-serif] font-bold text-[11.5px] text-white leading-tight">
                        Amit Kumar
                      </div>
                      <div className="text-[9.5px] text-emerald-300 font-medium">
                        Sales Executive
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectRole) onSelectRole('admin');
                      onSelectSection('customer-portal');
                    }}
                    className="text-[10px] text-slate-300 hover:text-white font-semibold underline underline-offset-2 transition-colors"
                  >
                    Logout
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};
