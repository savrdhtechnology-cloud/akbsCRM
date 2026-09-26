import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  FileText,
  MapPin,
  ChevronRight,
  Filter,
  Search,
  ArrowRight,
  Check,
  Send,
  Building2,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import { Lead, Employee, ManagerApproval, SiteVisitLog } from '../../types';

interface ManagerPortalViewProps {
  leads: Lead[];
  employees: Employee[];
  approvals: ManagerApproval[];
  siteVisits: SiteVisitLog[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onAssignLead: (leadId: string, employeeName: string) => void;
  onSwitchPortal?: (portal: 'admin' | 'employee' | 'partner') => void;
  isAdminViewing?: boolean;
}

export const ManagerPortalView: React.FC<ManagerPortalViewProps> = ({
  leads,
  employees,
  approvals,
  siteVisits,
  onApprove,
  onReject,
  onAssignLead,
  onSwitchPortal,
  isAdminViewing = true
}) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'allocation' | 'visits' | 'performance'>('approvals');
  const [selectedAudit, setSelectedAudit] = useState<SiteVisitLog | null>(null);
  const [managerActionMessage, setManagerActionMessage] = useState('');

  const showManagerMessage = (message: string) => {
    setManagerActionMessage(message);
    window.setTimeout(() => setManagerActionMessage(''), 3000);
  };

  const exportRegionalMis = () => {
    const rows = [
      ['Lead','Location','Bird Capacity','Status','Assigned To'],
      ...leads.map(l => [l.name,l.location,String(l.birdCapacity),l.status,l.assignedTo])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a=document.createElement('a'); a.href=url; a.download='akbs-regional-mis.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const [searchLead, setSearchLead] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedEmp, setSelectedEmp] = useState<string>('Vikash Kumar (Sales)');

  const pendingApprovals = approvals.filter(a => a.status === 'Pending');
  const totalApprovedAmount = approvals
    .filter(a => a.status === 'Approved')
    .reduce((sum, a) => sum + a.amount, 0);

  const handleAssign = (leadId: string) => {
    if (!selectedEmp) return;
    onAssignLead(leadId, selectedEmp);
    setSelectedLeadId('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1300px] mx-auto">
      {/* Top Banner if Admin is viewing */}
      {isAdminViewing && (
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-sm">
              👔
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Manager Portal View</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Super Admin Full Access
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                You have master authority to approve DPRs, re-assign leads, and override branch manager decisions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchPortal && onSwitchPortal('admin')}
              className="px-3 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Back to Admin Hub</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Manager Operations Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#0b2818] text-white">
              Central Zone
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Branch approvals, field team workload distribution, and project feasibility authorizations
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Approval Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingApprovals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('allocation')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'allocation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>Lead Allocation</span>
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'visits'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-700" />
            <span>Field Site Audits</span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-700" />
            <span>Zone Targets</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Manager */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pending Approvals</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            {pendingApprovals.length}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Requires manager sign-off
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Approved DPR Value</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-800 mt-1">
            ₹ {(totalApprovedAmount / 100000).toFixed(1)} L
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Ready for bank sanction
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Field Staff</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            {employees.length} Officers
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            100% on-field today
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Monthly Target Birds</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            1,20,000
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            78% target achieved (93.6k birds)
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Pending Authorization Queue ({approvals.length})
            </h2>
            <span className="text-xs text-slate-500">
              High priority commercial & credit exceptions
            </span>
          </div>

          <div className="space-y-3">
            {approvals.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.priority === 'High'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.priority} Priority
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'Rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.submittedDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400">Farmer / Customer:</span>{' '}
                      <span className="font-semibold text-slate-800">{item.farmerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Requested By:</span>{' '}
                      <span className="font-semibold text-slate-800">{item.requestedBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Financial Value:</span>{' '}
                      <span className="font-bold font-mono text-emerald-800">
                        ₹ {item.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {item.comments && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                      <span className="font-semibold text-slate-700">Note:</span> {item.comments}
                    </p>
                  )}
                </div>

                {item.status === 'Pending' ? (
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => onReject(item.id)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => onApprove(item.id)}
                      className="px-4 py-2 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Authorize</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-500 self-end md:self-center">
                    Action Completed
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Allocation Tab */}
      {activeTab === 'allocation' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Lead Distribution & Field Officer Assignment
              </h2>
              <p className="text-xs text-slate-500">
                Assign fresh website, WhatsApp, and phone inquiries to field consultants
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchLead}
                onChange={(e) => setSearchLead(e.target.value)}
                placeholder="Search lead or location..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Farmer / Lead</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Current Assignee</th>
                  <th className="py-2.5 px-3">Re-Assign Officer</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {leads
                  .filter(l => l.name.toLowerCase().includes(searchLead.toLowerCase()) || l.location.toLowerCase().includes(searchLead.toLowerCase()))
                  .slice(0, 8)
                  .map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{lead.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{lead.phone}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{lead.location}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {lead.birdCapacity.toLocaleString()} birds
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold">
                          {lead.assignedTo || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none"
                          defaultValue={lead.assignedTo}
                          onChange={(e) => {
                            setSelectedEmp(e.target.value);
                            setSelectedLeadId(lead.id);
                          }}
                        >
                          {employees.map(emp => (
                            <option key={emp.id} value={`${emp.name} (${emp.department.split(' ')[0]})`}>
                              {emp.name} ({emp.role})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleAssign(lead.id)}
                          className="px-2.5 py-1 bg-[#0b2818] hover:bg-[#123e27] text-white text-[11px] font-bold rounded-md shadow-xs transition-colors"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Field Site Audits Tab */}
      {activeTab === 'visits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Supervisor Site Visit Inspection Logs
              </h2>
              <p className="text-xs text-slate-500">
                Water TDS, land feasibility, and power connectivity verified on-site
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {siteVisits.map((visit) => (
              <div
                key={visit.id}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-mono text-slate-400">{visit.visitDate}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    visit.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {visit.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{visit.farmerName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-700" />
                    <span>{visit.location}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Water TDS</span>
                    <span className={`font-mono font-bold ${visit.waterTds > 400 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {visit.waterTds} ppm
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">3-Phase Power</span>
                    <span className="font-bold text-slate-800">
                      {visit.powerAvailable ? 'Available' : 'Pending Sanction'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Capacity</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {visit.birdCapacity.toLocaleString()} Birds
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Shed Size</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {visit.shedSizeSqFt.toLocaleString()} sq.ft
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {visit.notes}
                </p>

                <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Inspector: <b>{visit.employeeName}</b></span>
                  <button onClick={() => setSelectedAudit(visit)} className="text-emerald-700 font-bold hover:underline">
                    View Full Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone Targets Tab */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              District Wise Capacity Target vs Achieved
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Raipur Zone (45,000 / 50,000 birds)</span>
                  <span className="font-bold text-emerald-800 font-mono">90%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Durg & Bhilai Zone (28,000 / 35,000 birds)</span>
                  <span className="font-bold text-emerald-800 font-mono">80%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Bilaspur Zone (12,000 / 20,000 birds)</span>
                  <span className="font-bold text-amber-700 font-mono">60%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Indore & Malwa MP (8,600 / 15,000 birds)</span>
                  <span className="font-bold text-blue-700 font-mono">57%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '57%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Manager Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button onClick={() => { setActiveTab('approvals'); showManagerMessage('AHIDF quota request workflow opened in Approvals.'); }} className="p-3 rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all">
                <div className="font-bold text-slate-900">Request AHIDF Quota</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Apply for 3% interest subvention</div>
              </button>
              <button onClick={() => showManagerMessage('Batch DOC authorization recorded for partner coordination.')} className="p-3 rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all">
                <div className="font-bold text-slate-900">Authorize Batch DOC</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Release 40,000 chicks to hatcheries</div>
              </button>
              <button onClick={() => { setActiveTab('visits'); showManagerMessage('Site Visits opened. Select a visit/farmer for audit scheduling.'); }} className="p-3 rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all">
                <div className="font-bold text-slate-900">Schedule Field Audit</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Send veterinarian to farm</div>
              </button>
              <button onClick={exportRegionalMis} className="p-3 rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all">
                <div className="font-bold text-slate-900">Export Regional MIS</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Download monthly director report</div>
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedAudit(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between pb-3 border-b"><div><h3 className="font-bold text-slate-900">Site Visit Audit</h3><p className="text-xs text-slate-500">{selectedAudit.farmerName} · {selectedAudit.location}</p></div><button onClick={() => setSelectedAudit(null)} className="text-xl text-slate-400">×</button></div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Inspector</span><div className="font-bold">{selectedAudit.employeeName}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Visit Date</span><div className="font-bold">{selectedAudit.visitDate}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Capacity</span><div className="font-mono font-bold">{selectedAudit.birdCapacity.toLocaleString()} Birds</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Shed Area</span><div className="font-mono font-bold">{selectedAudit.shedSizeSqFt.toLocaleString()} sq.ft</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Water TDS</span><div className="font-mono font-bold">{selectedAudit.waterTds}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Power</span><div className="font-bold">{selectedAudit.powerAvailable ? 'Available' : 'Not Available'}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2"><span className="text-slate-400">Notes</span><div className="font-semibold">{selectedAudit.notes}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
