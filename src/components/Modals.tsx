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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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
