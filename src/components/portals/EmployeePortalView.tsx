import React, { useState } from 'react';
import {
  User,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Calendar,
  Award,
  Plus,
  Send,
  Camera,
  FileCheck,
  AlertCircle,
  TrendingUp,
  X,
  Building
} from 'lucide-react';
import { Lead, Task, SiteVisitLog, LeadStatus } from '../../types';
import { SoftQuotationModal } from '../SoftQuotationModal';

interface EmployeePortalViewProps {
  leads: Lead[];
  tasks: Task[];
  siteVisits: SiteVisitLog[];
  onAddSiteVisit: (visit: SiteVisitLog) => void;
  onUpdateLeadStatus: (id: string, status: LeadStatus) => void;
  onRequestApproval?: (title: string, farmerName: string, amount: number) => void;
  onSwitchPortal?: (portal: 'admin' | 'manager' | 'partner') => void;
  isAdminViewing?: boolean;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  leads,
  tasks,
  siteVisits,
  onAddSiteVisit,
  onUpdateLeadStatus,
  onRequestApproval,
  onSwitchPortal,
  isAdminViewing = true
}) => {
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [checkInTime] = useState('09:15 AM');
  const [activeTab, setActiveTab] = useState<'my-leads' | 'site-visit' | 'tasks' | 'incentives'>('my-leads');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [quotationLead, setQuotationLead] = useState<Lead | null>(null);

  // Form state for Site Visit Logger
  const [farmerName, setFarmerName] = useState('');
  const [location, setLocation] = useState('');
  const [birdCapacity, setBirdCapacity] = useState(10000);
  const [shedSizeSqFt, setShedSizeSqFt] = useState(11000);
  const [waterTds, setWaterTds] = useState(320);
  const [powerAvailable, setPowerAvailable] = useState(true);
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Leads assigned to Vikash Kumar or sales
  const myLeads = leads.filter(l => 
    l.assignedTo?.toLowerCase().includes('vikash') || 
    l.assignedTo?.toLowerCase().includes('sales')
  );

  const mySiteVisits = siteVisits.filter(v => 
    v.employeeName.toLowerCase().includes('vikash')
  );

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName) return;

    const newVisit: SiteVisitLog = {
      id: `sv-${Date.now()}`,
      employeeName: 'Vikash Kumar',
      farmerName,
      location: location || 'Raipur District',
      birdCapacity: Number(birdCapacity),
      shedSizeSqFt: Number(shedSizeSqFt),
      waterTds: Number(waterTds),
      powerAvailable,
      notes: notes || 'Site inspected. Ground level checked and soil bearing capacity recorded.',
      visitDate: '24 Sep 2026',
      status: waterTds > 400 ? 'Needs Follow-up' : 'Approved'
    };

    onAddSiteVisit(newVisit);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsLogModalOpen(false);
      setFarmerName('');
      setNotes('');
    }, 1500);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1300px] mx-auto">
      {/* Top Banner if Admin is viewing */}
      {isAdminViewing && (
        <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-800 flex items-center justify-center font-bold text-sm">
              👷
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Employee & Field Consultant Portal View</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                  Simulated as: Vikash Kumar
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Staff view for logging daily field farmer visits, GPS attendance, updating lead stages, and incentives.
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

      {/* Profile & Attendance Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-950/20">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold text-slate-900">
                Vikash Kumar
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Senior Field Consultant
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>Raipur & Durg Cluster</span>
              </span>
              <span>•</span>
              <span className="font-mono text-slate-600">+91 98261 44021</span>
              <span>•</span>
              <span className="text-slate-400">ID: AKBS-EMP-004</span>
            </div>
          </div>
        </div>

        {/* GPS Punch-In Widget */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Field Attendance
            </div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isCheckedIn ? `Punched In (${checkInTime})` : 'Punched Out'}</span>
            </div>
          </div>
          <button
            onClick={() => setIsCheckedIn(!isCheckedIn)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isCheckedIn
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
            }`}
          >
            {isCheckedIn ? 'Punch Out' : 'Punch In (GPS)'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Assigned Leads</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            {myLeads.length} Leads
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            3 High priority conversions
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Site Inspections Done</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            {mySiteVisits.length} Farms
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            100% soil & TDS verified
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Booked Bird Capacity</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-800 mt-1">
            38,500 Birds
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Target: 50,000 birds (77%)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">My Earned Commission</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-purple-700 mt-1">
            ₹ 38,500
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            ₹ 1 / bird incentive tier
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my-leads')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'my-leads'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            My Assigned Leads ({myLeads.length})
          </button>
          <button
            onClick={() => setActiveTab('site-visit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'site-visit'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Farm Site Audits ({mySiteVisits.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tasks'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Today's Visits & Calls
          </button>
          <button
            onClick={() => setActiveTab('incentives')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'incentives'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Incentive Ladder
          </button>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Log Field Site Visit</span>
        </button>
      </div>

      {/* Tab: My Assigned Leads */}
      {activeTab === 'my-leads' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {myLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lead.status === 'Converted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : lead.status === 'Proposal Sent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {lead.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{lead.source}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{lead.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{lead.location}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Capacity</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {lead.birdCapacity.toLocaleString()} Birds
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Budget</span>
                      <span className="font-bold text-slate-800">
                        {lead.budgetEstimate}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50/50 p-2 rounded border border-slate-100">
                    {lead.notes}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${lead.phone}`}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                      title="Call Farmer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Stage Quick Changer */}
                  <select
                    value={lead.status}
                    onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                    className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Site Visit">Site Visit</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Site Audits Done */}
      {activeTab === 'site-visit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySiteVisits.map((visit) => (
              <div
                key={visit.id}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
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
                  <p className="text-xs text-slate-500 mt-0.5">{visit.location}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] text-slate-400">Water TDS</span>
                    <div className="font-mono font-bold text-slate-900">{visit.waterTds} ppm</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Power Connection</span>
                    <div className="font-bold text-slate-900">
                      {visit.powerAvailable ? '3-Phase OK' : 'Required'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Bird Capacity</span>
                    <div className="font-mono font-bold text-slate-900">{visit.birdCapacity.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Shed Dimension</span>
                    <div className="font-mono font-bold text-slate-900">{visit.shedSizeSqFt} sq.ft</div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50/50 p-2 rounded">
                  {visit.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Vikash Kumar's Field Schedule Today
          </h2>
          <div className="space-y-2">
            {tasks.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{t.title}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{t.subtitle}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {t.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Incentives */}
      {activeTab === 'incentives' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Employee Sales Incentive Slab
          </h2>
          <p className="text-xs text-slate-500">
            Earned per live bird shed capacity closed under turnkey AKBS contract
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50">
              <div className="font-bold text-emerald-900">Tier 1: Up to 25,000 Birds</div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-1">₹ 0.75 / Bird</div>
              <div className="text-[11px] text-slate-500 mt-1">Basic target threshold</div>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-500 bg-emerald-50">
              <div className="font-bold text-emerald-900">Tier 2: 25k - 50k Birds (Current)</div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-1">₹ 1.00 / Bird</div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">You are currently here!</div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-700">Tier 3: Above 50,000 Birds</div>
              <div className="text-xl font-bold font-mono text-slate-700 mt-1">₹ 1.50 / Bird</div>
              <div className="text-[11px] text-slate-400 mt-1">Bonus: ₹ 15,000 fuel allowance</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Field Site Visit */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Log Field Site Visit & Technical Feasibility
                </h3>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Farmer / Lead Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar Verma"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Farm Village / District</label>
                  <input
                    type="text"
                    placeholder="e.g. Arang, Raipur"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Planned Capacity</label>
                  <input
                    type="number"
                    value={birdCapacity}
                    onChange={(e) => setBirdCapacity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Water TDS (ppm)</label>
                  <input
                    type="number"
                    value={waterTds}
                    onChange={(e) => setWaterTds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Ideal for poultry: &lt; 350 ppm</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">3-Phase Power</label>
                  <select
                    value={powerAvailable ? 'yes' : 'no'}
                    onChange={(e) => setPowerAvailable(e.target.value === 'yes')}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="yes">Available on site</option>
                    <option value="no">Transformer needed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inspection Observations & Soil Notes</label>
                <textarea
                  rows={2}
                  placeholder="Distance from village, road accessibility, soil firmness, water borehole depth..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              {savedSuccess && (
                <div className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Site audit logged and submitted for Manager approval!
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg font-bold shadow-xs"
                >
                  Save Inspection Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
