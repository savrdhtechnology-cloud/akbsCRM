import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  Calculator,
  IndianRupee,
  Building,
  TrendingUp,
  Clock,
  Sparkles,
  Send
} from 'lucide-react';
import { ProposalDPR } from '../types';
import { SoftQuotationModal } from './SoftQuotationModal';

interface DprProposalsViewProps {
  proposals: ProposalDPR[];
  onOpenCreateProposal: () => void;
  onUpdateProposalStatus?: (proposalId: string, status: ProposalDPR['status']) => void;
}

export const DprProposalsView: React.FC<DprProposalsViewProps> = ({
  proposals,
  onOpenCreateProposal,
  onUpdateProposalStatus
}) => {
  const [selectedProposal, setSelectedProposal] = useState<ProposalDPR>(proposals[0]);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

  // Quick interactive calculator state
  const [calcBirds, setCalcBirds] = useState(10000);
  const [shedType, setShedType] = useState<'EC' | 'Open'>('EC');

  // AKBS approved commercial template. Do not auto-invent rates for unapproved configurations.
  const isApprovedAkbsTemplate = calcBirds === 20000 && shedType === 'EC';
  const totalSqFt = isApprovedAkbsTemplate ? 12000 : Math.round(calcBirds * (shedType === 'EC' ? 0.6 : 1.2));

  // Approved breakup: 17L + 27L + 8L + 20L + 28L + 20L = ₹1.20 Cr.
  const totalProjectCost = isApprovedAkbsTemplate ? 12000000 : 0;

  // These are only arithmetic illustrations against the selected project cost.
  // Actual eligibility / loan / subsidy must be confirmed by the bank/scheme.
  const subsidyAmount = isApprovedAkbsTemplate ? Math.round(totalProjectCost * 0.25) : 0;
  const bankLoan = isApprovedAkbsTemplate ? Math.round(totalProjectCost * 0.75) : 0;
  const farmerMargin = isApprovedAkbsTemplate ? Math.round(totalProjectCost * 0.25) : 0;

  // Market-linked annual returns are intentionally not auto-generated.
  const estAnnualIncome = 0

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Poultry DPR & Proposals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed Project Reports (DPR), bank project feasibility, and turnkey quotations for farmers
          </p>
        </div>

        <button
          onClick={onOpenCreateProposal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Generate New DPR / Proposal</span>
        </button>
      </div>

      {/* Interactive Quick DPR Estimator */}
      <div className="bg-gradient-to-r from-emerald-900 to-[#0a2719] text-white p-5 rounded-2xl shadow-md border border-emerald-800">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wide">
              Instant Poultry Project Feasibility & NABARD Subsidy Estimator
            </h2>
          </div>
          <span className="text-[11px] bg-emerald-800/80 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
            AKBS Approved Template
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
          {/* Controls */}
          <div className="md:col-span-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-emerald-200">
                <span>Flock Capacity (Birds):</span>
                <span className="font-mono font-bold text-white text-sm">{calcBirds.toLocaleString()} Birds</span>
              </div>
              <input
                type="range"
                min="5000"
                max="50000"
                step="2500"
                value={calcBirds}
                onChange={(e) => setCalcBirds(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-emerald-300/80 font-mono mt-0.5">
                <span>5,000</span>
                <span>20,000</span>
                <span>50,000</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-emerald-200 block mb-1.5">Shed Technology:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShedType('EC')}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all ${
                    shedType === 'EC' ? 'bg-emerald-500 text-emerald-950 shadow-xs' : 'bg-emerald-800/50 text-emerald-200'
                  }`}
                >
                  Environment Controlled (EC)
                </button>
                <button
                  type="button"
                  onClick={() => setShedType('Open')}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all ${
                    shedType === 'Open' ? 'bg-emerald-500 text-emerald-950 shadow-xs' : 'bg-emerald-800/50 text-emerald-200'
                  }`}
                >
                  Open Sided Deep Litter
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-black/25 p-3 rounded-xl border border-emerald-700/50">
              <span className="text-[11px] text-emerald-300">Total Project Outlay</span>
              <div className="text-base font-bold font-mono text-white mt-1">
                {isApprovedAkbsTemplate ? `₹ ${(totalProjectCost / 100000).toFixed(2)} Lakhs` : 'Requires Confirmation'}
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                Shed: {totalSqFt.toLocaleString()} sq ft
              </span>
            </div>

            <div className="bg-black/25 p-3 rounded-xl border border-emerald-700/50">
              <span className="text-[11px] text-emerald-300">NABARD Subsidy (25%)</span>
              <div className="text-base font-bold font-mono text-emerald-300 mt-1">
                {isApprovedAkbsTemplate ? `₹ ${(subsidyAmount / 100000).toFixed(2)} Lakhs` : 'Requires Confirmation'}
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">Indicative assumption — confirm eligibility</span>
            </div>

            <div className="bg-black/25 p-3 rounded-xl border border-emerald-700/50">
              <span className="text-[11px] text-emerald-300">Bank Loan (75%)</span>
              <div className="text-base font-bold font-mono text-white mt-1">
                {isApprovedAkbsTemplate ? `₹ ${(bankLoan / 100000).toFixed(2)} Lakhs` : 'Requires Confirmation'}
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">Indicative assumption — confirm with bank</span>
            </div>

            <div className="bg-black/25 p-3 rounded-xl border border-emerald-700/50">
              <span className="text-[11px] text-emerald-300">Est. Annual Return</span>
              <div className="text-base font-bold font-mono text-amber-300 mt-1">
                Requires Confirmation
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block">Market / integration inputs required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals List and Detail Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* List of DPRs */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Active DPR Proposals ({proposals.length})
          </h2>

          <div className="space-y-2">
            {proposals.map((p) => {
              const isSelected = selectedProposal?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProposal(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">{p.id}</span>
                      <h3 className="text-xs font-bold text-slate-900 mt-0.5">{p.leadName}</h3>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      p.status === 'Accepted'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : p.status === 'Sent'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : p.status === 'Under Review'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 mt-1 line-clamp-1">{p.projectTitle}</div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      ₹ {(p.totalCost / 100000).toFixed(2)} Lakhs
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p.createdDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected DPR Document Sheet Preview */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider">
                Official Project Report Summary
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {selectedProposal.projectTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQuotationModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Soft Quotation (WhatsApp)</span>
              </button>
              <select
                value={selectedProposal.status}
                onChange={(e) => {
                  const status = e.target.value as ProposalDPR['status'];
                  setSelectedProposal(prev => ({ ...prev, status }));
                  onUpdateProposalStatus?.(selectedProposal.id, status);
                }}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                title="Update proposal status"
              >
                <option>Draft</option>
                <option>Sent</option>
                <option>Under Review</option>
                <option>Accepted</option>
                <option>Rejected</option>
              </select>
              <button
                onClick={() => window.print()}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                title="Print DPR"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px]">Beneficiary / Farmer:</span>
                <div className="font-bold text-slate-900 text-sm">{selectedProposal.leadName}</div>
                <div className="font-mono text-slate-500 mt-0.5">{selectedProposal.leadPhone}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Flock Capacity & Area:</span>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedProposal.birdCapacity.toLocaleString()} Birds
                </div>
                <div className="text-slate-500 mt-0.5">
                  Shed Area: {selectedProposal.shedSizeSqFt.toLocaleString()} Sq. Ft.
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Project Financial Outlay & Subsidies</h3>
              <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 text-slate-600">Total Capital Cost</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900 text-right">
                      ₹ {selectedProposal.totalCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-emerald-50/40">
                    <td className="p-2.5 text-emerald-800 font-medium">Eligible Subsidy (NABARD / State Scheme)</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700 text-right">
                      - ₹ {selectedProposal.subsidyEligible.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 text-slate-600">Bank Term Loan (75%)</td>
                    <td className="p-2.5 font-mono font-semibold text-slate-800 text-right">
                      ₹ {selectedProposal.bankLoanAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-2.5 text-slate-600">Farmer Margin Equity (25%)</td>
                    <td className="p-2.5 font-mono font-semibold text-slate-800 text-right">
                      ₹ {selectedProposal.farmerContribution.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-slate-100/70">
                    <td className="p-2.5 text-slate-900 font-bold">Estimated Payback Period</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700 text-right">
                      {selectedProposal.roiMonths} Months (~{Math.round(selectedProposal.roiMonths / 12)} Years)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Technical Note:</strong> Prepared in compliance with National Action Plan for Poultry and Ministry of Fisheries, Animal Husbandry & Dairying norms.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsQuotationModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <span>📜</span>
                <span>Generate & Send Soft Quotation to {selectedProposal.leadName}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Soft Quotation Modal */}
      <SoftQuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        initialData={{
          name: selectedProposal.leadName,
          phone: selectedProposal.leadPhone,
          birdCapacity: selectedProposal.birdCapacity,
          poultryType: 'Broiler',
          shedType: 'EC',
          projectCost: `₹ ${(selectedProposal.totalCost / 100000).toFixed(2)} Lakhs`
        }}
      />
    </div>
  );
};
