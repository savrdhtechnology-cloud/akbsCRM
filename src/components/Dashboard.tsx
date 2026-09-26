import React, { useState } from 'react';
import {
  Users,
  Mail,
  UserCheck,
  Building2,
  FileText,
  IndianRupee,
  ArrowUp,
  Calendar,
  Phone,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Filter,
  Check,
  Plus,
  UserPlus,
  Handshake,
  CalendarPlus,
  UploadCloud,
  Send,
  Eye,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Edit,
  Sparkles,
} from 'lucide-react';
import { Lead, Task, Activity, NavigationSection } from '../types';

interface DashboardProps {
  leads: Lead[];
  tasks: Task[];
  activities: Activity[];
  onSelectSection: (section: NavigationSection) => void;
  onOpenQuickAction: (actionKey: string, lead?: Lead) => void;
  onSelectLead: (lead: Lead) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateLeadStatus?: (leadId: string, status: any) => void;
  onAssignLead?: (leadId: string, employeeName: string) => void;
  onEditLead?: (leadId: string, patch: Partial<Lead>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  leads,
  tasks,
  activities,
  onSelectSection,
  onOpenQuickAction,
  onSelectLead,
  onToggleTask,
  onUpdateLeadStatus,
  onAssignLead,
  onEditLead
}) => {
  // Selected Inquiry for the Inquiry Details card (defaults to first lead or Rakesh Yadav)
  const [selectedInquiry, setSelectedInquiry] = useState<Lead>(() => {
    const rakesh = leads.find(l => l.name.toLowerCase().includes('rakesh yadav'));
    return rakesh || leads[0];
  });

  const [inquiryStatus, setInquiryStatus] = useState<string>(selectedInquiry?.status || 'New');
  const [assignedStaff, setAssignedStaff] = useState<string>(selectedInquiry?.assignedTo || 'Shailendra');
  const [noteText, setNoteText] = useState<string>('');
  const [inquiryNoteSuccess, setInquiryNoteSuccess] = useState(false);

  // Email Template State
  const [activeTemplate, setActiveTemplate] = useState<string>('welcome');
  const [emailSubject, setEmailSubject] = useState('Thank you for contacting AKBS Poultry Farming');
  const [emailBody, setEmailBody] = useState(
    `Dear ${selectedInquiry?.name || 'Customer'},\n\nThank you for reaching out to AKBS Poultry Farming. We will get back to you shortly with the required project details, DPR estimation, and bank subsidy guidelines.\n\nBest Regards,\nTeam AKBS Poultry Farming\nHelpline: +91 98261 44019`
  );
  const [emailSentAlert, setEmailSentAlert] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Follow-up tab filter
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');

  // Interactive Hover state for Inquiries Trend
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  // Handle clicking inquiry row
  const handleSelectInquiryRow = (lead: Lead) => {
    setSelectedInquiry(lead);
    setInquiryStatus(lead.status);
    setAssignedStaff(lead.assignedTo || 'Shailendra');
    setEmailBody(
      `Dear ${lead.name},\n\nThank you for reaching out to AKBS Poultry Farming regarding your ${lead.birdCapacity || 5000} bird poultry project. We will get back to you shortly.\n\nBest Regards,\nTeam AKBS Poultry Farming`
    );
    onSelectLead(lead);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    setInquiryNoteSuccess(true);
    setTimeout(() => setInquiryNoteSuccess(false), 2500);
    setNoteText('');
  };

  const handleSendEmail = () => {
    setEmailSentAlert(true);
    setTimeout(() => setEmailSentAlert(false), 3000);
  };

  // 7-day inquiries trend data matching Image 2
  const trendPoints = [
    { label: '7 Sep', count: 2, x: 25, y: 130 },
    { label: '8 Sep', count: 3, x: 75, y: 115 },
    { label: '9 Sep', count: 4, x: 125, y: 95 },
    { label: '10 Sep', count: 5, x: 175, y: 80 },
    { label: '11 Sep', count: 4, x: 225, y: 90 },
    { label: '12 Sep', count: 6, x: 275, y: 55 },
    { label: '13 Sep', count: 7, x: 325, y: 35 }
  ];

  // Lead Sources donut data matching Image 2
  const leadSourceSegments = [
    { label: 'Website', percent: 45, color: '#10b981', count: 11, dash: '113 251', offset: '0' },
    { label: 'WhatsApp', percent: 25, color: '#6b93a5', count: 6, dash: '62.8 251', offset: '-113' },
    { label: 'Direct Call', percent: 15, color: '#bd9b55', count: 4, dash: '37.7 251', offset: '-175.8' },
    { label: 'Email', percent: 10, color: '#9ba88b', count: 2, dash: '25.1 251', offset: '-213.5' },
    { label: 'Others', percent: 5, color: '#94a3b8', count: 1, dash: '12.5 251', offset: '-238.6' }
  ];

  // Inquiries for Table (prioritize Image 2 leads + top new leads)
  const recentInquiries = leads.slice(0, 6);

  // Follow-up list items matching Image 2
  const followUpItems = [
    { id: '1', name: 'Seema Choudhary', task: 'Call for site visit discussion', time: 'Today, 11:00 AM', status: 'today' },
    { id: '2', name: 'Balram Singh', task: 'Share updated DPR', time: 'Today, 03:00 PM', status: 'today' },
    { id: '3', name: 'Amit Patel', task: 'Follow up on loan documents', time: '14 Sep, 10:00 AM', status: 'week' },
    { id: '4', name: 'Farhan Khan', task: 'Send quotation', time: '15 Sep, 12:00 PM', status: 'week' }
  ];

  const filteredFollowUps = followUpItems.filter(item => {
    if (followUpFilter === 'today') return item.status === 'today';
    if (followUpFilter === 'week') return item.status === 'week';
    if (followUpFilter === 'overdue') return false;
    return true;
  });

  return (
    <div className="crm-dashboard p-4 sm:p-5 lg:p-6 space-y-5 max-w-[1680px] mx-auto font-sans antialiased text-slate-800">
      {/* Top Welcome & Subtitle Row matching Image 2 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              CRM Dashboard
            </h1>
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Inquiries | Convert Leads | Grow Your Business
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-700 italic">
              AKBS Poultry Farming
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              Business overview
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Welcome Banner Banner */}
      <div className="crm-welcome bg-gradient-to-r from-[#071d12] via-[#0b2818] to-[#123e27] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 border border-emerald-900/40">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white flex items-center gap-2">
            <span>Welcome Back, Shailendra!</span>
            <span className="text-emerald-400 text-sm font-normal">👋</span>
          </h2>
          <p className="text-xs text-emerald-200/90 mt-1">
            Here's what's happening with your poultry business today. 7 new customer inquiries awaiting your review.
          </p>
        </div>
      </div>

      <div className="crm-metrics">
        {[
          { label: 'Total Inquiries', value: '24', badge: 'All time', icon: Mail, section: 'leads', tone: 'green' },
          { label: 'New / Unread', value: '7', badge: 'Needs review', icon: MessageSquare, section: 'leads', tone: 'blue' },
          { label: 'Replied', value: '12', badge: 'In conversation', icon: Send, section: 'leads', tone: 'gold' },
          { label: 'Converted', value: '5', badge: 'Successful', icon: TrendingUp, section: 'leads', tone: 'green' },
          { label: 'Follow Up', value: '3', badge: 'Scheduled', icon: CalendarPlus, section: 'followups', tone: 'rose' }
        ].map(({ label, value, badge, icon: Icon, section, tone }) => (
          <button key={label} type="button" className={`crm-metric crm-metric--${tone}`} onClick={() => onSelectSection(section as NavigationSection)}>
            <div className="crm-metric-top"><span className="crm-metric-icon"><Icon size={19} /></span><ChevronRight size={15} /></div>
            <div className="crm-metric-value">{value}</div>
            <div className="crm-metric-label">{label}</div>
            <div className="crm-metric-badge">{badge}</div>
          </button>
        ))}
      </div>

      {/* Row 2: Charts Row matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Chart 1: Inquiries Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Inquiries Trend</span>
            </h2>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none">
              <option>Last 7 Days</option>
              <option>Last 14 Days</option>
              <option>This Month</option>
            </select>
          </div>

          {/* Smooth Green Curved SVG Line Chart matching Image 2 */}
          <div className="pt-4 pb-1">
            <div className="relative">
              <svg viewBox="0 0 350 160" className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="inquiryTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="20" y1="20" x2="330" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="60" x2="330" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="100" x2="330" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="140" x2="330" y2="140" stroke="#e2e8f0" />

                {/* Area Gradient */}
                <path
                  d="M 25 130 C 50 125, 60 115, 75 115 C 100 115, 110 95, 125 95 C 150 95, 160 80, 175 80 C 200 80, 210 90, 225 90 C 250 90, 260 55, 275 55 C 300 55, 310 35, 325 35 L 325 140 L 25 140 Z"
                  fill="url(#inquiryTrendGradient)"
                />

                {/* Green Smooth Stroke Line */}
                <path
                  d="M 25 130 C 50 125, 60 115, 75 115 C 100 115, 110 95, 125 95 C 150 95, 160 80, 175 80 C 200 80, 210 90, 225 90 C 250 90, 260 55, 275 55 C 300 55, 310 35, 325 35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Dots on data points */}
                {trendPoints.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredTrendIdx === idx ? '6' : '4'}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredTrendIdx(idx)}
                      onMouseLeave={() => setHoveredTrendIdx(null)}
                    />
                  </g>
                ))}
              </svg>

              {/* Tooltip on hover */}
              {hoveredTrendIdx !== null && (
                <div
                  className="absolute bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-8"
                  style={{
                    left: `${(trendPoints[hoveredTrendIdx].x / 350) * 100}%`,
                    top: '20%'
                  }}
                >
                  <div className="font-bold">{trendPoints[hoveredTrendIdx].label}</div>
                  <div className="text-emerald-400 font-mono">{trendPoints[hoveredTrendIdx].count} inquiries</div>
                </div>
              )}

              {/* X Axis Labels */}
              <div className="flex justify-between text-[11px] font-mono text-slate-400 px-2 mt-2">
                {trendPoints.map((pt, idx) => (
                  <span key={idx}>{pt.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Lead Source (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Lead Source</h2>
            <span className="text-[11px] text-slate-400">Total: 24</span>
          </div>

          <div className="flex items-center gap-6 py-2">
            {/* Donut Chart Canvas */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                {leadSourceSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="14"
                    strokeDasharray={seg.dash}
                    strokeDashoffset={seg.offset}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onMouseEnter={() => setHoveredDonutIdx(idx)}
                    onMouseLeave={() => setHoveredDonutIdx(null)}
                  />
                ))}
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-base font-semibold text-slate-900 font-mono leading-tight">24</span>
                <span className="text-[10px] text-slate-400 font-semibold leading-none">Inquiries</span>
              </div>
            </div>

            {/* Legend List matching Image 2 */}
            <div className="flex-1 space-y-1.5 text-xs">
              {leadSourceSegments.map((src, idx) => (
                <div
                  key={src.label}
                  className={`flex items-center justify-between text-xs p-1 rounded-md transition-colors ${
                    hoveredDonutIdx === idx ? 'bg-slate-100 font-bold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }}></span>
                    <span className="text-slate-700 font-medium">{src.label}</span>
                  </div>
                  <span className="font-mono text-slate-900 font-bold">{src.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Inquiries Table & Quick Actions matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Recent Inquiries Table (7 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>Recent Inquiries</span>
            </h2>
            <button
              onClick={() => onSelectSection('leads')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 hover:underline"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInquiries.map((lead) => {
                  const isSelected = selectedInquiry?.id === lead.id;
                  let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (lead.status === 'Contacted') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (lead.status === 'Follow Up') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleSelectInquiryRow(lead)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {lead.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {lead.phone}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate" title={lead.notes}>
                        {lead.notes}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {lead.source}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                        {lead.date}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${badgeStyle}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>{lead.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 hover:text-slate-700">
                        <MoreVertical className="w-4 h-4 ml-auto" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Actions (4 cols) matching Image 2 */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            {/* 1. Add New Inquiry (Solid Green) */}
            <button
              onClick={() => onOpenQuickAction('add-lead')}
              className="w-full p-2.5 rounded-xl bg-[#0b2818] hover:bg-[#123e27] text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add New Inquiry</span>
            </button>

            {/* 2. Send Email */}
            <button
              onClick={() => onOpenQuickAction('send-email', selectedInquiry)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors"
            >
              <Mail className="w-4 h-4 text-purple-600" />
              <span>Send Email</span>
            </button>

            {/* 3. Send WhatsApp */}
            <a
              href={`https://wa.me/${selectedInquiry?.whatsApp?.replace(/[^0-9]/g, '') || selectedInquiry?.phone.replace(/[^0-9]/g, '') || '919876543210'}`}
              target="_blank"
              rel="noreferrer"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Send WhatsApp</span>
            </a>

            {/* 4. Schedule Follow Up */}
            <button
              onClick={() => onOpenQuickAction('add-followup', selectedInquiry)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors"
            >
              <CalendarPlus className="w-4 h-4 text-rose-600" />
              <span>Schedule Follow Up</span>
            </button>

            {/* 5. View Reports */}
            <button
              onClick={() => onSelectSection('reports')}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors"
            >
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>View Reports</span>
            </button>

            {/* 6. Manage Templates */}
            <button
              onClick={() => onSelectSection('communication')}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Manage Templates</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: Bottom 3 Cards matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Card 1: Inquiry Details matching Image 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">Inquiry Details</h2>
            <button
              onClick={() => onSelectSection('leads')}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Contact Details */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0b2818] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {selectedInquiry?.name?.[0] || 'R'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{selectedInquiry?.name || 'Rakesh Yadav'}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  • {selectedInquiry?.status || 'New'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap font-mono">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {selectedInquiry?.phone || '9876543210'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {selectedInquiry?.email || 'rakesh@gmail.com'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                ⏰ {selectedInquiry?.date || '13 Sep 2026'}, {selectedInquiry?.time || '10:45 AM'}
              </div>
            </div>
          </div>

          {/* Message Content Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
            "{selectedInquiry?.notes || 'I want to start 5000 bird farm. Please share complete project details, cost and loan support.'}"
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
            <button
              onClick={() => onOpenQuickAction('call', selectedInquiry)}
              className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-1 text-slate-700"
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>Call</span>
            </button>
            <a
              href={`https://wa.me/${selectedInquiry?.whatsApp?.replace(/[^0-9]/g, '') || selectedInquiry?.phone.replace(/[^0-9]/g, '') || '919876543210'}`}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-1 text-slate-700"
            >
              <MessageSquare className="w-3 h-3 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
            <button
              onClick={() => onOpenQuickAction('send-email', selectedInquiry)}
              className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-1 text-slate-700"
            >
              <Send className="w-3 h-3 text-purple-600" />
              <span>Reply</span>
            </button>
            <button className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Controls: Update Status & Assign To */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Update Status</label>
              <select
                value={inquiryStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  setInquiryStatus(value);
                  if (selectedInquiry && onUpdateLeadStatus) onUpdateLeadStatus(selectedInquiry.id, value as any);
                  setSelectedInquiry(prev => prev ? { ...prev, status: value as any } : prev);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Assign To</label>
              <select
                value={assignedStaff}
                onChange={(e) => {
                  const value = e.target.value;
                  setAssignedStaff(value);
                  if (selectedInquiry && onAssignLead) onAssignLead(selectedInquiry.id, value);
                  setSelectedInquiry(prev => prev ? { ...prev, assignedTo: value } : prev);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="Shailendra">Shailendra</option>
                <option value="Ankit Sharma">Ankit Sharma</option>
                <option value="Vikash Kumar">Vikash Kumar</option>
                <option value="Pooja Verma">Pooja Verma</option>
              </select>
            </div>
          </div>

          {/* Add Note & Save button */}
          <div className="space-y-2 pt-1">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note about this inquiry..."
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
            />
            <div className="flex items-center justify-between">
              {inquiryNoteSuccess && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Note Saved!
                </span>
              )}
              <button
                onClick={handleSaveNote}
                className="ml-auto px-4 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Email Templates matching Image 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Email Templates</h2>
            <button onClick={() => onSelectSection('communication')} className="text-[11px] text-emerald-700 font-semibold cursor-pointer hover:underline">
              Manage All
            </button>
          </div>

          <div className="grid grid-cols-12 gap-3 items-start">
            {/* Left Column: Template Tabs matching Image 2 */}
            <div className="col-span-5 space-y-1 text-xs font-semibold">
              {[
                { id: 'welcome', label: 'Welcome Email', icon: '✉' },
                { id: 'project', label: 'Project Info', icon: '🏢' },
                { id: 'dpr', label: 'DPR & Costing', icon: '📑' },
                { id: 'loan', label: 'Loan Support', icon: '🏦' },
                { id: 'followup', label: 'Follow Up', icon: '⏰' },
                { id: 'thankyou', label: 'Thank You', icon: '🤝' }
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setActiveTemplate(tpl.id);
                    if (tpl.id === 'welcome') {
                      setEmailSubject('Thank you for contacting AKBS Poultry Farming');
                      setEmailBody(`Dear ${selectedInquiry?.name || 'Customer'},\n\nThank you for reaching out to AKBS Poultry Farming. We will get back to you shortly with the required project details, DPR estimation, and bank subsidy guidelines.\n\nBest Regards,\nTeam AKBS Poultry Farming`);
                    } else if (tpl.id === 'dpr') {
                      setEmailSubject(`Detailed Project Report (DPR) - ${selectedInquiry?.birdCapacity || 10000} Birds Setup`);
                      setEmailBody(`Dear ${selectedInquiry?.name || 'Customer'},\n\nPlease find attached the turnkey DPR proposal, civil shed estimate, equipment quotation, and projected cash flow statement for your poultry project.\n\nBest Regards,\nTeam AKBS Poultry Farming`);
                    } else if (tpl.id === 'loan') {
                      setEmailSubject('NABARD Subsidy & Agri Bank Loan Documentation');
                      setEmailBody(`Dear ${selectedInquiry?.name || 'Customer'},\n\nWe have prepared your bank loan documentation checklist and subsidy feasibility report under Animal Husbandry Infrastructure Development Fund (AHIDF).\n\nBest Regards,\nLoan Desk, AKBS Poultry`);
                    }
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                    activeTemplate === tpl.id
                      ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{tpl.icon}</span>
                  <span className="truncate">{tpl.label}</span>
                </button>
              ))}
            </div>

            {/* Right Column: Template Editor */}
            <div className="col-span-7 space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Message</label>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(v => !v)}
                  className="px-2.5 py-1 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Preview
                </button>

                <button
                  onClick={handleSendEmail}
                  className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Email</span>
                </button>
              </div>

              {showEmailPreview && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 whitespace-pre-wrap max-h-28 overflow-y-auto">
                  <div className="font-bold text-slate-800 mb-1">{emailSubject}</div>
                  {emailBody}
                </div>
              )}

              {emailSentAlert && (
                <div className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Email sent successfully to {selectedInquiry?.email || 'customer'}!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Follow Up Management matching Image 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Follow Up Management</h2>
            <button
              onClick={() => onSelectSection('followups')}
              className="text-xs text-emerald-800 font-bold hover:underline"
            >
              View All
            </button>
          </div>

          {/* Sub-tabs: All | Today | This Week | Overdue */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'overdue', label: 'Overdue' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFollowUpFilter(tab.id as any)}
                className={`flex-1 py-1 rounded-lg text-center transition-all ${
                  followUpFilter === tab.id
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Follow-up Items matching Image 2 */}
          <div className="space-y-2.5 divide-y divide-slate-100">
            {filteredFollowUps.map((item) => (
              <div key={item.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{item.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {item.task}
                  </div>
                  <div className="text-[10px] text-rose-600 font-mono font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{item.time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const phone = leads.find(lead => lead.name.toLowerCase() === item.name.toLowerCase())?.phone || selectedInquiry?.phone || '';
                      if (phone) window.location.href = `tel:${phone}`;
                    }}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    title="Call"
                  >
                    <Phone className="w-3 h-3" />
                  </button>
                  <button className="p-1 text-slate-400 hover:text-slate-700">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
