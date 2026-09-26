import { useCrm } from '../lib/crm';
import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  Bell,
  MessageSquare,
  ChevronDown,
  UserPlus,
  Building,
  FileText,
  Landmark,
  CalendarPlus,
  UploadCloud,
  Mail,
  X,
  Phone,
  CheckCircle2,
  Briefcase,
  HardHat,
  Truck,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { Lead, Customer, NavigationSection, PortalRole } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenQuickAction: (actionKey: string) => void;
  onSelectSection: (section: NavigationSection) => void;
  currentSection?: NavigationSection;
  leads: Lead[];
  customers: Customer[];
  onSelectLead: (lead: Lead) => void;
  currentRole?: PortalRole;
  onSelectRole?: (role: PortalRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenQuickAction,
  onSelectSection,
  currentSection = 'dashboard',
  leads,
  customers,
  onSelectLead,
  currentRole = 'admin',
  onSelectRole
}) => {
  const crm=useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPortalMenuOpen, setIsPortalMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (portalMenuRef.current && !portalMenuRef.current.contains(event.target as Node)) {
        setIsPortalMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter search results
  const searchResultsLeads = searchQuery.trim() 
    ? leads.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.includes(searchQuery) ||
        l.location.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  const searchResultsCustomers = searchQuery.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.farmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  return (
    <header className="crm-header sticky top-0 z-30 min-h-16 h-auto bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl crm-header-search-row">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative flex-1 min-w-0 w-full max-w-md crm-header-search">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads or customers..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Live Search Popup */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Leads & Inquiries
              </div>
              {searchResultsLeads.length > 0 ? (
                searchResultsLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      onSelectLead(lead);
                      setSearchQuery('');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{lead.name}</span>
                      <span className="text-slate-500 ml-2">({lead.birdCapacity.toLocaleString()} birds, {lead.location})</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {lead.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-1.5 text-xs text-slate-400">No matching leads</div>
              )}

              <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-1">
                Customers / Farms
              </div>
              {searchResultsCustomers.length > 0 ? (
                searchResultsCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectSection('customers');
                      setSearchQuery('');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className="text-slate-500 ml-2 font-normal">· {c.farmName}</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {c.capacity.toLocaleString()} Birds
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-1.5 text-xs text-slate-400">No matching farms</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: + Add, Notification, Messages, Settings, User profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 crm-header-actions">
        {/* + Add Dropdown */}
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isAddMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { onOpenQuickAction('add-lead'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Add New Lead</span>
              </button>
              <button
                onClick={() => { onOpenQuickAction('add-customer'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 font-medium transition-colors"
              >
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Add Customer Farm</span>
              </button>
              <button
                onClick={() => { onOpenQuickAction('add-partner'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 font-medium transition-colors"
              >
                <Building className="w-4 h-4 text-blue-600" />
                <span>Add Equipment/Feed Partner</span>
              </button>
              <button
                onClick={() => { onOpenQuickAction('create-proposal'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 flex items-center gap-2.5 font-medium transition-colors"
              >
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Create DPR / Proposal</span>
              </button>
              <button
                onClick={() => { onOpenQuickAction('loan-application'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2.5 font-medium transition-colors"
              >
                <Landmark className="w-4 h-4 text-amber-600" />
                <span>New Loan Application</span>
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => { onOpenQuickAction('add-followup'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-900 flex items-center gap-2.5 font-medium transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-rose-600" />
                <span>Schedule Follow-up</span>
              </button>
              <button
                onClick={() => { onOpenQuickAction('upload-document'); setIsAddMenuOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 font-medium transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-slate-600" />
                <span>Upload Document / NOC</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon with Badge */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {notificationCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">Notifications ({notificationCount})</span>
                <button onClick={() => setNotificationCount(0)} className="text-[11px] text-emerald-700 hover:underline cursor-pointer font-medium">Mark all read</button>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {crm.activities.slice(0,8).map(a=><button key={a.id} onClick={()=>{const l=leads.find(l=>l.id===a.lead_id);if(l)onSelectLead(l);setIsNotificationsOpen(false);}} className="w-full text-left p-3 text-xs"><strong>{a.action.replaceAll('_',' ')}</strong><p>{a.note}</p></button>)}
                {!crm.activities.length&&<p className="p-3 text-xs">No recent activity.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Communication Icon */}
        <button
          onClick={() => onSelectSection('communication')}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Direct Communication & Messages"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        {/* Portal Role Switcher */}
        <div className="relative" ref={portalMenuRef}>
          <button
            onClick={() => setIsPortalMenuOpen(!isPortalMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-xs bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800"
            title="Switch User Portal"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden md:inline text-[11px] text-slate-500 font-normal">Portal:</span>
            <span className="text-slate-900 font-bold">
              {currentRole === 'admin' && 'Super Admin'}
              {currentRole === 'manager' && 'Manager'}
              {currentRole === 'employee' && 'Employee'}
              {currentRole === 'partner' && 'Partner'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isPortalMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 pb-2 border-b border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Active Portal
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Admin can view & manage any portal
                </div>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    if (onSelectRole) onSelectRole('admin');
                    onSelectSection('dashboard');
                    setIsPortalMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center justify-between ${
                    currentRole === 'admin' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div>Super Admin Portal</div>
                      <div className="text-[10px] text-slate-500 font-normal">Full Master Control</div>
                    </div>
                  </div>
                  {currentRole === 'admin' && <span className="text-emerald-700 font-bold text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    if (onSelectRole) onSelectRole('manager');
                    onSelectSection('manager-portal');
                    setIsPortalMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center justify-between ${
                    currentRole === 'manager' ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-700" />
                    <div>
                      <div>Manager Portal</div>
                      <div className="text-[10px] text-slate-500 font-normal">Approvals & Lead Allocation</div>
                    </div>
                  </div>
                  {currentRole === 'manager' && <span className="text-amber-700 font-bold text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    if (onSelectRole) onSelectRole('employee');
                    onSelectSection('employee-portal');
                    setIsPortalMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center justify-between ${
                    currentRole === 'employee' ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-blue-700" />
                    <div>
                      <div>Employee Portal</div>
                      <div className="text-[10px] text-slate-500 font-normal">Field Site Visits & Tasks</div>
                    </div>
                  </div>
                  {currentRole === 'employee' && <span className="text-blue-700 font-bold text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    if (onSelectRole) onSelectRole('partner');
                    onSelectSection('partner-portal');
                    setIsPortalMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center justify-between ${
                    currentRole === 'partner' ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-700" />
                    <div>
                      <div>Partner Portal</div>
                      <div className="text-[10px] text-slate-500 font-normal">DOC / Feed Supply Orders</div>
                    </div>
                  </div>
                  {currentRole === 'partner' && <span className="text-purple-700 font-bold text-xs">✓</span>}
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 px-1">
                <button
                  onClick={() => {
                    onSelectSection('admin-control');
                    setIsPortalMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left rounded-lg hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Admin RBAC & Portals Manager</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative pl-1 sm:pl-2 border-l border-slate-200" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 text-left hover:bg-slate-50 p-1 rounded-lg transition-colors"
          >
            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs ${
              currentRole === 'admin' ? 'bg-[#0b2818]' : currentRole === 'manager' ? 'bg-amber-700' : currentRole === 'employee' ? 'bg-blue-700' : 'bg-purple-700'
            }`}>
              {currentRole === 'admin' ? 'S' : currentRole === 'manager' ? 'M' : currentRole === 'employee' ? 'V' : 'P'}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentRole === 'admin' && crm.user.name}
                {currentRole === 'manager' && 'Suresh Verma'}
                {currentRole === 'employee' && 'Vikash Kumar'}
                {currentRole === 'partner' && 'Venky\'s / Partner'}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold leading-tight capitalize">
                {currentRole === 'admin' ? 'Admin • Grow Farmers Grow India' : `${currentRole} Portal`}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-900">AKBS Poultry Farming</p>
                <p className="text-[10px] text-slate-500 truncate">admin@akbspoultry.com</p>
              </div>
              <button
                onClick={() => { onSelectSection('admin-control'); setIsProfileOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 font-medium"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                <span>Admin Portals & Roles</span>
              </button>
              <button
                onClick={() => { onSelectSection('settings'); setIsProfileOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Company Profile & Mandi Rates
              </button>
              <button
                onClick={() => { onSelectSection('employees'); setIsProfileOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Staff Directory & Sales Team
              </button>
              <button
                onClick={() => { onSelectSection('partners'); setIsProfileOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Suppliers & Hatcheries
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

