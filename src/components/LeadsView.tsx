import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Phone,
  MessageSquare,
  Globe,
  MoreVertical,
  Calendar,
  MapPin,
  CheckCircle2,
  Building,
  Eye,
  Trash2,
  Users,
  Target,
  Clock,
  Send,
  UserCheck,
  Edit,
  UserPlus,
  FileText,
  Paperclip,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Star,
  Layers,
  Landmark,
  Shield,
  UploadCloud,
  CheckSquare
} from 'lucide-react';
import { Lead, LeadStatus, LeadSource, DocumentRecord, FollowUp, Activity } from '../types';
import { SoftQuotationModal } from './SoftQuotationModal';

interface LeadsViewProps {
  leads: Lead[];
  selectedLeadId?: string;
  onSelectLead: (lead: Lead) => void;
  onOpenAddLead: () => void;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenQuickAction?: (actionKey: string, lead?: Lead) => void;
  documents?: DocumentRecord[];
  followUps?: FollowUp[];
  activities?: Activity[];
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  selectedLeadId,
  onSelectLead,
  onOpenAddLead,
  onUpdateLeadStatus,
  onDeleteLead,
  onOpenQuickAction,
  documents = [],
  followUps = [],
  activities = []
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [stateFilter, setStateFilter] = useState('All States');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [selectedLead, setSelectedLead] = useState<Lead>(() => {
    if (selectedLeadId) {
      const found = leads.find(l => l.id === selectedLeadId);
      if (found) return found;
    }
    return leads[0] || ({} as Lead);
  });
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [activeDetailTab, setActiveDetailTab] = useState<
    'overview' | 'project' | 'financial' | 'documents' | 'activities' | 'followups'
  >('overview');

  const [newNoteText, setNewNoteText] = useState('');
  const [noteType, setNoteType] = useState('Internal Note');
  const [notesList, setNotesList] = useState([
    { id: '1', text: 'Spoke with customer. Looking for turnkey EC shed setup with automatic pan feeding.', author: 'Ankit Sharma', time: '2 hours ago', type: 'Internal Note' }
  ]);

  // Synchronize when selectedLeadId prop changes
  React.useEffect(() => {
    if (selectedLeadId) {
      const found = leads.find(l => l.id === selectedLeadId);
      if (found) {
        setSelectedLead(found);
      }
    }
  }, [selectedLeadId, leads]);

  // Handle lead selection
  const handleSelectLeadCard = (lead: Lead) => {
    setSelectedLead(lead);
    onSelectLead(lead);
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.location && l.location.toLowerCase().includes(search.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStage = stageFilter === 'All Stages' || l.status === stageFilter;
    const matchesState = stateFilter === 'All States' || (l.state && l.state.toLowerCase().includes(stateFilter.toLowerCase()));
    const matchesSource = sourceFilter === 'All Sources' || l.source === sourceFilter;

    if (activeTab === 'my') {
      return matchesSearch && matchesStage && matchesState && matchesSource && (l.assignedTo?.includes('Shailendra') || l.assignedTo?.includes('Ankit'));
    }
    if (activeTab === 'unassigned') {
      return matchesSearch && matchesStage && matchesState && matchesSource && (!l.assignedTo || l.assignedTo === 'Unassigned');
    }
    return matchesSearch && matchesStage && matchesState && matchesSource;
  });

  React.useEffect(() => {
    setPage(1);
  }, [search, stageFilter, stateFilter, sourceFilter, activeTab]);

  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / perPage));
  const safePage = Math.min(page, pageCount);
  const pagedLeads = filteredLeads.slice((safePage - 1) * perPage, safePage * perPage);

  const currentLead = leads.find(l => l.id === selectedLead.id) || selectedLead || leads[0];
  const relatedDocuments = documents.filter(d =>
    d.relatedEntity.toLowerCase().includes(currentLead?.name?.toLowerCase() || '')
  );
  const relatedFollowUps = followUps.filter(f => f.leadId === currentLead?.id);
  const similarLeads = leads
    .filter(l => l.id !== currentLead?.id)
    .sort((a, b) => Math.abs((a.birdCapacity || 0) - (currentLead?.birdCapacity || 0)) - Math.abs((b.birdCapacity || 0) - (currentLead?.birdCapacity || 0)))
    .slice(0, 3);

  const exportFilteredLeads = () => {
    const rows = [
      ['Name','Phone','Email','Location','Status','Source','Bird Capacity','Assigned To'],
      ...filteredLeads.map(l => [l.name,l.phone,l.email,l.location,l.status,l.source,String(l.birdCapacity),l.assignedTo])
    ];
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'akbs-leads.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    setNotesList(prev => [
      {
        id: `note-${Date.now()}`,
        text: newNoteText.trim(),
        author: 'Shailendra Choudhary',
        time: 'Just now',
        type: noteType
      },
      ...prev
    ]);
    setNewNoteText('');
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Contacted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Qualified':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Site Visit':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DPR':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Loan Processing':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Converted':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'Lost':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'In Discussion':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Follow Up':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-700 text-white',
      'bg-pink-600 text-white',
      'bg-amber-600 text-white',
      'bg-blue-600 text-white',
      'bg-purple-600 text-white',
      'bg-teal-600 text-white',
      'bg-indigo-600 text-white'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    if (!name) return 'L';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1680px] mx-auto font-sans antialiased text-slate-800">
      {/* Top Header Row matching Image 3 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Leads Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, track and convert your poultry project leads into successful customers.
          </p>
        </div>

        {/* Counter Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">Total Leads</div>
              <div className="text-sm font-extrabold text-blue-950 font-mono mt-0.5">{leads.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">New Leads</div>
              <div className="text-sm font-extrabold text-emerald-950 font-mono mt-0.5">{leads.filter(l => l.status === 'New').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">In Process</div>
              <div className="text-sm font-extrabold text-amber-950 font-mono mt-0.5">{leads.filter(l => !['New','Converted','Lost'].includes(l.status)).length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">Site Visit</div>
              <div className="text-sm font-extrabold text-purple-950 font-mono mt-0.5">{leads.filter(l => l.status === 'Site Visit').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">Converted</div>
              <div className="text-sm font-extrabold text-teal-950 font-mono mt-0.5">{leads.filter(l => l.status === 'Converted').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px]">01 Sep 2026 - 30 Sep 2026</span>
          </div>

          <button
            onClick={onOpenAddLead}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Grid Layout matching Image 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ================= COLUMN 1: Leads List (4 cols) ================= */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col h-[820px]">
          {/* Top Sub-tabs */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Leads ({leads.length})
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'my' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Leads ({leads.filter(l => l.assignedTo?.includes('Shailendra') || l.assignedTo?.includes('Ankit')).length})
              </button>
              <button
                onClick={() => setActiveTab('unassigned')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'unassigned' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unassigned ({leads.filter(l => !l.assignedTo || l.assignedTo === 'Unassigned').length})
              </button>
            </div>
            <button onClick={exportFilteredLeads} className="text-slate-400 hover:text-slate-600 p-1" title="Export filtered leads CSV">
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar & Filter row */}
          <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile, location..."
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
              >
                <option value="All Stages">All Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Site Visit">Site Visit</option>
                <option value="DPR">DPR</option>
                <option value="Loan Processing">Loan Processing</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
              >
                <option value="All States">All States</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
              >
                <option value="All Sources">All Sources</option>
                <option value="Website">Website</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Direct Call">Direct Call</option>
                <option value="Email">Email</option>
              </select>
            </div>
          </div>

          {/* Lead Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {pagedLeads.map((lead) => {
              const isSelected = lead.id === currentLead.id;
              const initials = getInitials(lead.name);

              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLeadCard(lead)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-400/80 shadow-2xs'
                      : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(lead.name)}`}>
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{lead.name}</span>
                          {lead.isHot && (
                            <span className="text-[10px] text-red-500 font-bold">★</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lead.location || 'India'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {lead.estimatedCost || lead.budgetEstimate || '₹50 Lakh'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {lead.birdCapacity ? `${lead.birdCapacity.toLocaleString()} Birds` : 'Poultry'} {lead.shedType?.includes('EC') ? '(EC)' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className={`px-2 py-0.5 rounded-md font-semibold border ${getStatusBadgeStyle(lead.status)}`}>
                      {lead.status}
                    </span>
                    <span className="text-slate-400">
                      {lead.relativeTime || lead.date || 'Today'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing {filteredLeads.length === 0 ? 0 : (safePage - 1) * perPage + 1}-{Math.min(safePage * perPage, filteredLeads.length)} of {filteredLeads.length} leads
            </span>
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="w-6 h-6 rounded flex items-center justify-center border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(3, pageCount) }, (_, index) => {
                const start = Math.max(1, Math.min(safePage - 1, pageCount - 2));
                const pageNo = start + index;
                return (
                  <button
                    key={pageNo}
                    onClick={() => setPage(pageNo)}
                    className={`w-6 h-6 rounded flex items-center justify-center border font-bold text-xs ${safePage === pageNo ? 'bg-[#0b2818] text-white border-[#0b2818]' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                  >
                    {pageNo}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="w-6 h-6 rounded flex items-center justify-center border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: Lead Details & Requirements (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Card Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${getAvatarColor(currentLead.name)}`}>
                  {getInitials(currentLead.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {currentLead.name}
                    </h2>
                    {currentLead.isHot && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <span>★</span> Hot Lead
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                    <span className="font-mono flex items-center gap-1 text-slate-800 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {currentLead.phone}
                    </span>
                    <a
                      href={`https://wa.me/${currentLead.whatsApp?.replace(/[^0-9]/g, '') || currentLead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <MessageSquare className="w-4 h-4 fill-emerald-500 text-white" />
                    </a>
                    {currentLead.email && (
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {currentLead.email}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {currentLead.location}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-800 font-medium">
                      Source: {currentLead.source} {currentLead.source === 'Website' ? '(Customer Portal)' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons right */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsQuotationModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
                  title="Send Soft Quotation to this Lead"
                >
                  <span>📜</span>
                  <span>Soft Quotation</span>
                </button>
                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('edit', currentLead)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('assign', currentLead)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Assign</span>
                </button>
                <button onClick={() => setActiveDetailTab('activities')} className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700" title="View activities">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-tabs bar */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 overflow-x-auto text-xs font-semibold">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'project', label: 'Project Details' },
                { id: 'financial', label: 'Financial' },
                { id: 'documents', label: 'Documents' },
                { id: 'activities', label: 'Activities' },
                { id: 'followups', label: 'Follow-ups' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeDetailTab === tab.id
                      ? 'bg-[#0f2e20] text-white font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeDetailTab === 'overview' && (
              <>
            {/* Basic Information Box */}
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>Basic Information</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Full Name:</span>
                  <div className="font-semibold text-slate-900">{currentLead.name}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Mobile:</span>
                  <div className="font-mono font-semibold text-slate-900">{currentLead.phone}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <div className="text-slate-900 truncate">{currentLead.email || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Location:</span>
                  <div className="text-slate-900">{currentLead.location}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Language:</span>
                  <div className="text-slate-900">{currentLead.language || 'Hindi'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Created On:</span>
                  <div className="font-mono text-slate-900">{currentLead.date}, {currentLead.time}</div>
                </div>
              </div>
            </div>

            {/* Project Requirement Box */}
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                <span>Project Requirement</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Project Type:</span>
                  <div className="font-semibold text-slate-900">New Poultry Farm</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Poultry Type:</span>
                  <div className="font-semibold text-slate-900">{currentLead.projectType || 'Broiler'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Shed Type:</span>
                  <div className="text-slate-900 font-semibold">{currentLead.shedType || 'EC (Environment Controlled)'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Proposed Capacity:</span>
                  <div className="text-slate-900 font-bold font-mono">
                    {currentLead.birdCapacity ? `${currentLead.birdCapacity.toLocaleString()} Birds` : '20,000 Birds'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Land Available:</span>
                  <div className="text-slate-900">{currentLead.landAvailable || 'Yes (Own Land)'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Land Area:</span>
                  <div className="text-slate-900 font-mono">{currentLead.landArea || '2.5 Acres'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Estimated Cost:</span>
                  <div className="text-slate-900 font-bold text-emerald-800 font-mono">
                    {currentLead.estimatedCost || currentLead.budgetEstimate || '₹1.75 Cr'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Loan Required:</span>
                  <div className="text-slate-900 font-mono">{currentLead.loanRequired || 'Yes (₹1.2 Cr)'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Timeline:</span>
                  <div className="text-slate-900 font-medium">{currentLead.timeline || 'Within 3 months'}</div>
                </div>
              </div>
            </div>

            {/* Current Status Box */}
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-700" />
                <span>Current Status</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Stage:</span>
                  <div>
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getStatusBadgeStyle(currentLead.status)}`}>
                      {currentLead.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Assigned To:</span>
                  <div className="font-semibold text-slate-900">{currentLead.assignedTo || 'Ankit Sharma'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Priority:</span>
                  <div className="font-semibold text-rose-700">★ {currentLead.priority || 'High'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Next Follow-up:</span>
                  <div className="font-mono text-slate-900">{currentLead.nextFollowUp || '23 Sep 2026, 11:00 AM'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Remarks:</span>
                  <div className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 mt-1">
                    {currentLead.notes || 'New lead from website. Interested in bank loan. Call scheduled tomorrow.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid matching Image 3 */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setIsQuotationModalOpen(true)}
                  className="p-2.5 rounded-xl border-2 border-emerald-600 bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 font-black text-emerald-950 shadow-xs col-span-2 sm:col-span-3"
                >
                  <span className="text-base">📜</span>
                  <span>Send Soft Quotation (कच्चा कोटेशन भेजें - WhatsApp / Email / PDF)</span>
                </button>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('call', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Log Call</span>
                </button>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('followup', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Schedule Follow-up</span>
                </button>

                <a
                  href={`https://wa.me/${currentLead.whatsApp?.replace(/[^0-9]/g, '') || currentLead.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send WhatsApp</span>
                </a>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('email', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <Send className="w-3.5 h-3.5 text-purple-600" />
                  <span>Send Email</span>
                </button>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('task', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Create Task</span>
                </button>

                <button
                  onClick={() => onUpdateLeadStatus(currentLead.id, 'Converted')}
                  className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 font-bold text-emerald-900"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Convert to Customer</span>
                </button>
              </div>
            </div>

            {/* Similar Leads / Suggestions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  Similar Leads / Suggestions
                </span>
                <button onClick={() => setActiveDetailTab('project')} className="text-emerald-700 hover:underline font-semibold text-[11px]">
                  View Similar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {similarLeads.map((item) => (
                  <button key={item.id} onClick={() => handleSelectLeadCard(item)} className="p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all cursor-pointer text-left">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${getAvatarColor(item.name)} text-[9px] font-bold flex items-center justify-center`}>
                        {getInitials(item.name)}
                      </div>
                      <div className="font-bold text-[11px] text-slate-900 truncate">{item.name}</div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{item.location}</div>
                    <div className="text-[10px] font-bold font-mono text-emerald-900">{item.estimatedCost || item.budgetEstimate}</div>
                    <div className="text-[9px] text-slate-400">{item.birdCapacity.toLocaleString()} Birds</div>
                  </button>
                ))}
              </div>
            </div>
              </>
            )}

            {activeDetailTab === 'project' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-2"><Building className="w-4 h-4 text-emerald-700" />Project Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-400">Project Type</span><div className="font-bold">{currentLead.projectType}</div></div>
                  <div><span className="text-slate-400">Bird Capacity</span><div className="font-bold font-mono">{currentLead.birdCapacity.toLocaleString()} Birds</div></div>
                  <div><span className="text-slate-400">Shed Type</span><div className="font-semibold">{currentLead.shedType || 'Not specified'}</div></div>
                  <div><span className="text-slate-400">Land Area</span><div className="font-semibold">{currentLead.landArea || 'Not specified'}</div></div>
                  <div><span className="text-slate-400">Land Ownership</span><div className="font-semibold">{currentLead.landOwnership || currentLead.landAvailable || 'Not specified'}</div></div>
                  <div><span className="text-slate-400">Timeline</span><div className="font-semibold">{currentLead.timeline || 'Not specified'}</div></div>
                  <div className="col-span-2"><span className="text-slate-400">Support Needed</span><div className="font-semibold">{currentLead.supportNeeded?.join(', ') || 'Turnkey project guidance'}</div></div>
                </div>
                <button onClick={() => onOpenQuickAction?.('edit', currentLead)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100">Edit Project Details</button>
              </div>
            )}

            {activeDetailTab === 'financial' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-700" />Financial & Loan Requirement</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-400">Budget Estimate</span><div className="font-bold text-emerald-800">{currentLead.estimatedCost || currentLead.budgetEstimate}</div></div>
                  <div><span className="text-slate-400">Loan Required</span><div className="font-bold">{currentLead.loanRequired || 'To be discussed'}</div></div>
                  <div><span className="text-slate-400">Status</span><div className="font-semibold">{currentLead.status}</div></div>
                  <div><span className="text-slate-400">Priority</span><div className="font-semibold">{currentLead.priority || 'Medium'}</div></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onOpenQuickAction?.('loan-application', currentLead)} className="px-3 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Create Loan File</button>
                  <button onClick={() => setIsQuotationModalOpen(true)} className="px-3 py-2 bg-amber-400 text-slate-950 rounded-lg font-bold">Soft Quotation</button>
                </div>
              </div>
            )}

            {activeDetailTab === 'documents' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-2"><Paperclip className="w-4 h-4 text-emerald-700" />Documents for {currentLead.name}</div>
                  <button onClick={() => onOpenQuickAction?.('upload-document', currentLead)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-emerald-800"><UploadCloud className="w-3.5 h-3.5 inline mr-1"/>Upload</button>
                </div>
                {relatedDocuments.length ? relatedDocuments.map(doc => (
                  <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div><div className="font-bold text-slate-900">{doc.name}</div><div className="text-[10px] text-slate-400">{doc.category} · {doc.fileSize} · {doc.uploadDate}</div></div>
                    <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-full">{doc.status}</span>
                  </div>
                )) : <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-center">No documents linked to this lead yet.</div>}
              </div>
            )}

            {activeDetailTab === 'activities' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-700" />Activity Timeline</div>
                <div className="space-y-2">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl"><div className="font-bold">Lead created</div><div className="text-slate-500">{currentLead.date}, {currentLead.time} · Source: {currentLead.source}</div></div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl"><div className="font-bold">Current stage</div><div className="text-slate-500">{currentLead.status} · Assigned to {currentLead.assignedTo || 'Unassigned'}</div></div>
                  {activities.slice(0,4).map(a => <div key={a.id} className="p-3 bg-white border border-slate-200 rounded-xl"><div className="font-bold">{a.title}</div><div className="text-slate-500">{a.description} · {a.time}</div></div>)}
                </div>
              </div>
            )}

            {activeDetailTab === 'followups' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between"><div className="font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-700" />Follow-ups</div><button onClick={() => onOpenQuickAction?.('followup', currentLead)} className="px-3 py-1.5 bg-[#0b2818] text-white rounded-lg font-bold">Schedule</button></div>
                {relatedFollowUps.length ? relatedFollowUps.map(f => (
                  <div key={f.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                    <div><div className="font-bold">{f.type} · {f.scheduledDate} {f.scheduledTime}</div><div className="text-slate-500 mt-1">{f.notes}</div></div>
                    <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-full">{f.status}</span>
                  </div>
                )) : <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-center">No follow-ups scheduled for this lead.</div>}
              </div>
            )}

          </div>
        </div>

        {/* ================= COLUMN 3: Activity Log, Notes, Follow-ups, Documents (3 cols) ================= */}
        <div className="lg:col-span-3 space-y-4">
          {/* Timeline / Activity Log */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Timeline / Activity Log</span>
              </h3>
              <button onClick={() => setActiveDetailTab('activities')} className="text-[11px] text-emerald-700 font-semibold hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-3 text-xs relative pl-4 border-l-2 border-slate-100 ml-2">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[21px] top-1 ring-4 ring-white" />
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <span>+ Lead Created</span>
                </div>
                <div className="text-[11px] text-slate-500">Lead registered via website</div>
                <div className="text-[10px] text-slate-400 font-mono">22 Sep 2026, 10:30 AM</div>
              </div>

              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[21px] top-1 ring-4 ring-white" />
                <div className="font-bold text-slate-900 text-xs">
                  📅 Follow-up Scheduled
                </div>
                <div className="text-[11px] text-slate-500">Call scheduled with {currentLead.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">22 Sep 2026, 11:00 AM by Ankit Sharma</div>
              </div>

              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -left-[21px] top-1 ring-4 ring-white" />
                <div className="font-bold text-slate-900 text-xs">
                  ↻ Status Updated
                </div>
                <div className="text-[11px] text-slate-500">Stage changed to New</div>
                <div className="text-[10px] text-slate-400 font-mono">22 Sep 2026, 10:31 AM by System</div>
              </div>
            </div>
          </div>

          {/* Add Note Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Add Note</span>
            </h3>
            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write a note about this lead..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
              >
                <option value="Internal Note">Internal Note</option>
                <option value="Client Discussion">Client Discussion</option>
                <option value="Site Observation">Site Observation</option>
              </select>
              <button
                onClick={handleSaveNote}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                Save Note
              </button>
            </div>

            {/* Saved Notes List */}
            {notesList.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                {notesList.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-700">{n.author}</span>
                      <span>{n.time}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug">{n.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Follow-ups Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upcoming Follow-ups</span>
              </h3>
              <button onClick={() => setActiveDetailTab('followups')} className="text-[11px] text-emerald-700 font-semibold hover:underline">
                View All
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call with {currentLead.name}</span>
                </div>
                <button onClick={() => setActiveDetailTab('followups')} className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-emerald-800 font-mono font-medium">
                23 Sep 2026, 11:00 AM
              </div>
              <p className="text-[11px] text-slate-500">
                Discuss land documents and financing options
              </p>
            </div>
          </div>

          {/* Related Documents Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                <span>Related Documents</span>
              </h3>
              <button onClick={() => onOpenQuickAction?.('upload-document', currentLead)} className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1">
                <UploadCloud className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Land Photo.jpg', size: '2.4 MB', date: '22 Sep 2026', icon: '🖼️' },
                { name: 'Aadhaar.pdf', size: '1.1 MB', date: '22 Sep 2026', icon: '📄' },
                { name: 'Project Proposal (Customer).pdf', size: '3.2 MB', date: '22 Sep 2026', icon: '📑' }
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{doc.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-800 text-[11px]">{doc.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{doc.size} • {doc.date}</div>
                    </div>
                  </div>
                  <button onClick={() => setActiveDetailTab('documents')} className="text-slate-400 hover:text-slate-600">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Soft Quotation Modal */}
      <SoftQuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        initialData={{
          name: currentLead.name,
          phone: currentLead.phone,
          email: currentLead.email,
          location: currentLead.location,
          state: currentLead.state,
          district: currentLead.district,
          village: currentLead.village,
          birdCapacity: currentLead.birdCapacity || 20000,
          poultryType: currentLead.projectType || 'Broiler',
          shedType: currentLead.shedType || 'EC (Environment Controlled)',
          leadId: currentLead.id,
          projectCost: currentLead.estimatedCost || currentLead.budgetEstimate
        }}
        onQuotationSent={(leadId) => {
          if (leadId) {
            onUpdateLeadStatus(leadId, 'Proposal Sent');
          }
        }}
      />
    </div>
  );
};
