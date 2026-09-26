import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Building,
  Handshake,
  FileText,
  Landmark,
  CalendarPlus,
  UploadCloud,
  Send,
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Lead, Customer, Partner, ProposalDPR, LoanApplication, DocumentRecord, FollowUp, LeadStatus, LeadSource } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 1. Add Lead Modal
export const AddLeadModal: React.FC<ModalProps & { onAdd: (lead: Lead) => void }> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('Website');
  const [location, setLocation] = useState('');
  const [birdCapacity, setBirdCapacity] = useState(10000);
  const [projectType, setProjectType] = useState<'Broiler' | 'Layer' | 'Breeder' | 'Country Chicken / Desi'>('Broiler');
  const [budgetEstimate, setBudgetEstimate] = useState('₹ 25 - 30 Lakhs');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name,
      phone: phone || '+91 98200 00000',
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      source,
      status: 'New',
      date: '24 Sep 2026',
      time: 'Just now',
      location: location || 'Raipur, Chhattisgarh',
      birdCapacity: Number(birdCapacity),
      projectType,
      budgetEstimate,
      notes: notes || 'New inquiry logged via CRM quick action.',
      assignedTo: 'Vikash Kumar (Sales)'
    };
    onAdd(newLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Add New Poultry Lead</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Farmer / Lead Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar Verma"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Inquiry Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="Website">Website</option>
                <option value="Phone Call">Phone Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Direct Visit">Direct Visit</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Bird Capacity</label>
              <input
                type="number"
                step="1000"
                value={birdCapacity}
                onChange={(e) => setBirdCapacity(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Farm Location / District</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Durg, Chhattisgarh"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Project Type</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="Broiler">Commercial Broiler (Meat)</option>
              <option value="Layer">Commercial Layer (Eggs)</option>
              <option value="Country Chicken / Desi">Country Chicken / Desi / Kadaknath</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Inquiry Details & Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Land availability, power connection, budget range..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg font-bold"
            >
              Save Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Add Customer Modal
export const AddCustomerModal: React.FC<ModalProps & { onAdd: (cust: Customer) => void }> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState('Madhya Pradesh');
  const [capacity, setCapacity] = useState(15000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      farmName: farmName || `${name} Poultry Farm`,
      phone: phone || '+91 98260 12345',
      email: `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      location: location || 'Indore',
      state,
      capacity: Number(capacity),
      shedType: 'Environment Controlled (EC)',
      status: 'Active',
      batchesCompleted: 1,
      currentBatchBirds: Number(capacity),
      joinedDate: '24 Sep 2026',
      integrationPartner: 'AKBS Direct Farming'
    };
    onAdd(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Register New Customer Farm</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Farmer / Owner Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Gupta"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Farm Name</label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Shri Ram Poultry Farm"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98260 00000"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Bird Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Location / Tehsil</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sanwer, Indore"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Haryana">Haryana</option>
                <option value="Bihar">Bihar</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg font-bold"
            >
              Register Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Lead Detail Drawer / Modal
export const LeadDetailDrawer: React.FC<{
  lead: Lead | null;
  onClose: () => void;
  onUpdateStatus: (id: string, s: LeadStatus) => void;
  onOpenCreateProposal: () => void;
  onOpenSoftQuotation?: () => void;
}> = ({ lead, onClose, onUpdateStatus, onOpenCreateProposal, onOpenSoftQuotation }) => {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0b2818] text-white flex items-center justify-center font-bold text-base shadow-xs">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{lead.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                <span>{lead.phone}</span>
                <span>·</span>
                <span>{lead.location}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Pipeline Stage:</span>
          <select
            value={lead.status}
            onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
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

        {/* Project Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[11px]">Bird Capacity:</span>
            <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
              {lead.birdCapacity.toLocaleString()} Birds
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[11px]">Estimated Investment:</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {lead.budgetEstimate}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[11px]">Project Type:</span>
            <div className="font-bold text-slate-900 mt-0.5">{lead.projectType}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[11px]">Assigned Manager:</span>
            <div className="font-bold text-slate-900 mt-0.5">{lead.assignedTo}</div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Farmer Requirements / Notes</label>
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
            {lead.notes}
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Lead</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSoftQuotation && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSoftQuotation();
                }}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>📜</span>
                <span>Send Soft Quotation</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onOpenCreateProposal();
              }}
              className="px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Create DPR for this Lead</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// 4. Edit Lead Modal
export const EditLeadModal: React.FC<ModalProps & {
  lead: Lead | null;
  onSave: (leadId: string, patch: Partial<Lead>) => void;
}> = ({ isOpen, onClose, lead, onSave }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [birdCapacity, setBirdCapacity] = useState(10000);
  const [budgetEstimate, setBudgetEstimate] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (isOpen && lead) {
      setName(lead.name);
      setPhone(lead.phone);
      setEmail(lead.email || '');
      setLocation(lead.location || '');
      setBirdCapacity(lead.birdCapacity || 10000);
      setBudgetEstimate(lead.budgetEstimate || '');
      setNotes(lead.notes || '');
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Edit Lead Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form
          className="mt-4 space-y-3 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(lead.id, { name, phone, email, location, birdCapacity, budgetEstimate, notes });
            onClose();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="font-semibold text-slate-600">Name</span><input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/></label>
            <label className="space-y-1"><span className="font-semibold text-slate-600">Phone</span><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"/></label>
            <label className="space-y-1"><span className="font-semibold text-slate-600">Email</span><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/></label>
            <label className="space-y-1"><span className="font-semibold text-slate-600">Location</span><input value={location} onChange={e=>setLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/></label>
            <label className="space-y-1"><span className="font-semibold text-slate-600">Bird Capacity</span><input type="number" value={birdCapacity} onChange={e=>setBirdCapacity(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"/></label>
            <label className="space-y-1"><span className="font-semibold text-slate-600">Budget Estimate</span><input value={budgetEstimate} onChange={e=>setBudgetEstimate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/></label>
          </div>
          <label className="block space-y-1"><span className="font-semibold text-slate-600">Notes</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/></label>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-3 py-2 bg-slate-100 rounded-lg font-semibold">Cancel</button><button className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Save Changes</button></div>
        </form>
      </div>
    </div>
  );
};

// 5. Assign Lead Modal
export const AssignLeadModal: React.FC<ModalProps & {
  lead: Lead | null;
  employeeNames: string[];
  onAssign: (leadId: string, employeeName: string) => void;
}> = ({ isOpen, onClose, lead, employeeNames, onAssign }) => {
  const [employee, setEmployee] = useState('');
  React.useEffect(() => {
    if (isOpen && lead) setEmployee(lead.assignedTo || employeeNames[0] || '');
  }, [isOpen, lead, employeeNames]);
  if (!isOpen || !lead) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">Assign Lead</h2><button onClick={onClose}><X className="w-4 h-4 text-slate-400"/></button></div>
        <div className="mt-4 text-xs space-y-3">
          <div className="p-3 bg-slate-50 rounded-xl"><div className="font-bold text-slate-900">{lead.name}</div><div className="text-slate-500">{lead.location}</div></div>
          <label className="block"><span className="font-semibold text-slate-600 block mb-1">Assign to employee / manager</span><select value={employee} onChange={e=>setEmployee(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">{employeeNames.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
          <div className="flex justify-end gap-2"><button onClick={onClose} className="px-3 py-2 bg-slate-100 rounded-lg font-semibold">Cancel</button><button onClick={()=>{onAssign(lead.id,employee);onClose();}} className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Assign</button></div>
        </div>
      </div>
    </div>
  );
};

// 6. Schedule Follow-up Modal
export const AddFollowUpModal: React.FC<ModalProps & {
  lead?: Lead | null;
  leads: Lead[];
  onAdd: (followUp: FollowUp) => void;
}> = ({ isOpen, onClose, lead, leads, onAdd }) => {
  const [leadId, setLeadId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00');
  const [type, setType] = useState<FollowUp['type']>('Phone Call');
  const [priority, setPriority] = useState<FollowUp['priority']>('Medium');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setLeadId(lead?.id || leads[0]?.id || '');
      const d = new Date(); d.setDate(d.getDate()+1);
      setDate(d.toISOString().slice(0,10));
      setNotes(lead ? `Follow up with ${lead.name}` : '');
    }
  }, [isOpen, lead, leads]);

  if (!isOpen) return null;
  const selected=leads.find(l=>l.id===leadId);
  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">Schedule Follow-up</h2><button onClick={onClose}><X className="w-4 h-4 text-slate-400"/></button></div>
        <form className="mt-4 space-y-3 text-xs" onSubmit={e=>{e.preventDefault(); if(!selected)return; onAdd({id:`fu-${Date.now()}`,leadId:selected.id,leadName:selected.name,phone:selected.phone,scheduledDate:new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),scheduledTime:time,type,status:'Pending',priority,notes:notes||`Follow up with ${selected.name}`}); onClose();}}>
          <label className="block"><span className="font-semibold text-slate-600 block mb-1">Lead</span><select value={leadId} onChange={e=>setLeadId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label><span className="font-semibold text-slate-600 block mb-1">Date</span><input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg"/></label><label><span className="font-semibold text-slate-600 block mb-1">Time</span><input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg"/></label></div>
          <div className="grid grid-cols-2 gap-3"><label><span className="font-semibold text-slate-600 block mb-1">Type</span><select value={type} onChange={e=>setType(e.target.value as FollowUp['type'])} className="w-full px-3 py-2 border rounded-lg"><option>Phone Call</option><option>Site Visit</option><option>DPR Discussion</option><option>Proposal Review</option><option>Loan Assistance</option></select></label><label><span className="font-semibold text-slate-600 block mb-1">Priority</span><select value={priority} onChange={e=>setPriority(e.target.value as FollowUp['priority'])} className="w-full px-3 py-2 border rounded-lg"><option>High</option><option>Medium</option><option>Low</option></select></label></div>
          <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Follow-up notes..." className="w-full px-3 py-2 border rounded-lg"/>
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 bg-slate-100 rounded-lg font-semibold">Cancel</button><button className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Schedule</button></div>
        </form>
      </div>
    </div>
  );
};

// 7. New DPR / Proposal Modal
export const AddProposalModal: React.FC<ModalProps & {
  lead?: Lead | null;
  leads: Lead[];
  onAdd: (proposal: ProposalDPR) => void;
}> = ({ isOpen, onClose, lead, leads, onAdd }) => {
  const [leadId,setLeadId]=useState('');
  const [cost,setCost]=useState(6000000);
  React.useEffect(()=>{if(isOpen){setLeadId(lead?.id||leads[0]?.id||'');}},[isOpen,lead,leads]);
  if(!isOpen)return null;
  const selected=leads.find(l=>l.id===leadId);
  return <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs"><div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel"><div className="flex items-center justify-between pb-3 border-b"><h2 className="text-sm font-bold">Generate DPR / Proposal</h2><button onClick={onClose}><X className="w-4 h-4"/></button></div><form className="mt-4 space-y-3 text-xs" onSubmit={e=>{e.preventDefault();if(!selected)return; const subsidy=Math.round(cost*.25);onAdd({id:`DPR-${Date.now().toString().slice(-6)}`,leadName:selected.name,leadPhone:selected.phone,projectTitle:`${selected.birdCapacity.toLocaleString()} Birds ${selected.projectType} Poultry Project`,birdCapacity:selected.birdCapacity,totalCost:cost,subsidyEligible:subsidy,bankLoanAmount:Math.round(cost*.75),farmerContribution:Math.round(cost*.25),shedSizeSqFt:Math.round(selected.birdCapacity*.75),roiMonths:36,status:'Draft',createdDate:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})});onClose();}}><label className="block"><span className="font-semibold block mb-1">Lead</span><select value={leadId} onChange={e=>setLeadId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label className="block"><span className="font-semibold block mb-1">Estimated Project Cost (₹)</span><input type="number" value={cost} onChange={e=>setCost(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg font-mono"/></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 bg-slate-100 rounded-lg">Cancel</button><button className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Create DPR</button></div></form></div></div>;
};

// 8. New Loan Application Modal
export const AddLoanModal: React.FC<ModalProps & { onAdd: (loan: LoanApplication) => void }> = ({ isOpen,onClose,onAdd }) => {
  const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [bank,setBank]=useState('SBI'); const [amount,setAmount]=useState(5000000); const [scheme,setScheme]=useState<LoanApplication['scheme']>('AHIDF Scheme');
  if(!isOpen)return null;
  return <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs"><div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel"><div className="flex justify-between pb-3 border-b"><h2 className="text-sm font-bold">New Loan File</h2><button onClick={onClose}><X className="w-4 h-4"/></button></div><form className="mt-4 space-y-3 text-xs" onSubmit={e=>{e.preventDefault();onAdd({id:`LOAN-${Date.now().toString().slice(-6)}`,applicantName:name,phone,bankName:bank,scheme,appliedAmount:amount,status:'Under Process',submissionDate:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})});onClose();}}><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Applicant name" className="w-full px-3 py-2 border rounded-lg"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 border rounded-lg"/><input value={bank} onChange={e=>setBank(e.target.value)} placeholder="Bank / Branch" className="w-full px-3 py-2 border rounded-lg"/><select value={scheme} onChange={e=>setScheme(e.target.value as LoanApplication['scheme'])} className="w-full px-3 py-2 border rounded-lg"><option>NABARD Poultry Venture Capital</option><option>AHIDF Scheme</option><option>SBI Agri Poultry Loan</option><option>PMAY Agri</option></select><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg font-mono"/><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 bg-slate-100 rounded-lg">Cancel</button><button className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Create Loan File</button></div></form></div></div>;
};

// 9. Upload Document Modal
export const UploadDocumentModal: React.FC<ModalProps & { onAdd: (doc: DocumentRecord) => void }> = ({ isOpen,onClose,onAdd }) => {
  const [name,setName]=useState(''); const [category,setCategory]=useState<DocumentRecord['category']>('DPR Report'); const [entity,setEntity]=useState(''); const [file,setFile]=useState<File|null>(null);
  if(!isOpen)return null;
  return <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-xs"><div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 crm-modal-panel"><div className="flex justify-between pb-3 border-b"><h2 className="text-sm font-bold">Upload Document</h2><button onClick={onClose}><X className="w-4 h-4"/></button></div><form className="mt-4 space-y-3 text-xs" onSubmit={e=>{e.preventDefault(); const fileName=file?.name||name||'Uploaded Document.pdf';onAdd({id:`DOC-${Date.now().toString().slice(-6)}`,name:fileName,category,relatedEntity:entity||'General',uploadDate:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),fileSize:file?`${(file.size/1024/1024).toFixed(2)} MB`:'—',fileType:file?.type||'application/pdf',status:'Pending Verification'});onClose();}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Document title (optional)" className="w-full px-3 py-2 border rounded-lg"/><select value={category} onChange={e=>setCategory(e.target.value as DocumentRecord['category'])} className="w-full px-3 py-2 border rounded-lg"><option>Land 7/12 Records</option><option>Electricity Sanction</option><option>Pollution NOC</option><option>DPR Report</option><option>Bank Sanction</option><option>Contract Agreement</option><option>Architect Drawing</option></select><input value={entity} onChange={e=>setEntity(e.target.value)} placeholder="Farmer / related entity" className="w-full px-3 py-2 border rounded-lg"/><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} className="w-full px-3 py-2 border rounded-lg"/><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 bg-slate-100 rounded-lg">Cancel</button><button className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Upload</button></div></form></div></div>;
};
