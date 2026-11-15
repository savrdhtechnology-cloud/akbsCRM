import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  CheckCircle2,
  Clock,
  IndianRupee,
  FileCheck,
  Building,
  AlertCircle
} from 'lucide-react';
import { LoanApplication } from '../types';

interface FinanceLoansViewProps {
  loans: LoanApplication[];
  onOpenNewLoan: () => void;
  onUpdateLoanStatus?: (loanId: string, status: LoanApplication['status']) => void;
}

export const FinanceLoansView: React.FC<FinanceLoansViewProps> = ({
  loans,
  onOpenNewLoan,
  onUpdateLoanStatus
}) => {
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Poultry Finance & Bank Loans
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track poultry project loan sanction files, NABARD venture capital subsidy, and bank disbursements
          </p>
        </div>

        <button
          onClick={onOpenNewLoan}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Loan File</span>
        </button>
      </div>

      {/* Loan Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loans.map((loan) => (
          <div
            key={loan.id}
            onClick={() => setSelectedLoan(loan)}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400">{loan.id}</span>
                  <h3 className="font-bold text-sm text-slate-900 mt-0.5">{loan.applicantName}</h3>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">{loan.phone}</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  loan.status === 'Sanctioned' || loan.status === 'Disbursed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {loan.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Bank / Branch:</span>
                  <span className="font-bold text-slate-900">{loan.bankName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Loan Scheme:</span>
                  <span className="font-medium text-emerald-800">{loan.scheme}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Applied Loan Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹ {(loan.appliedAmount / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                {loan.sanctionAmount && (
                  <div className="flex justify-between py-1 bg-emerald-50/60 px-2 rounded-md">
                    <span className="text-emerald-800 font-semibold">Sanctioned Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹ {(loan.sanctionAmount / 100000).toFixed(2)} Lakhs
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Applied: {loan.submissionDate}</span>
              <span className="text-emerald-700 font-semibold">DPR Linked</span>
            </div>
          </div>
        ))}
      </div>

      {selectedLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedLoan(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between pb-3 border-b">
              <div><div className="text-[10px] font-mono text-slate-400">{selectedLoan.id}</div><h2 className="font-bold text-slate-900">{selectedLoan.applicantName}</h2></div>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Bank</span><div className="font-bold">{selectedLoan.bankName}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Scheme</span><div className="font-bold">{selectedLoan.scheme}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Applied Amount</span><div className="font-mono font-bold">₹ {selectedLoan.appliedAmount.toLocaleString('en-IN')}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Sanctioned</span><div className="font-mono font-bold">{selectedLoan.sanctionAmount ? `₹ ${selectedLoan.sanctionAmount.toLocaleString('en-IN')}` : 'Pending'}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Phone</span><div className="font-mono font-bold">{selectedLoan.phone}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Submitted</span><div className="font-mono font-bold">{selectedLoan.submissionDate}</div></div>
            </div>
            <label className="block mt-4 text-xs"><span className="font-bold text-slate-600 block mb-1">Application Status</span>
              <select
                value={selectedLoan.status}
                onChange={(e) => {
                  const status=e.target.value as LoanApplication['status'];
                  setSelectedLoan(prev => prev ? {...prev,status} : prev);
                  onUpdateLoanStatus?.(selectedLoan.id,status);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option>Under Process</option><option>Documents Verified</option><option>Inspection Completed</option><option>Sanctioned</option><option>Disbursed</option>
              </select>
            </label>
            <div className="flex justify-end mt-4"><a href={`tel:${selectedLoan.phone}`} className="px-3 py-2 bg-[#0b2818] text-white rounded-lg font-bold text-xs">Call Applicant</a></div>
          </div>
        </div>
      )}
    </div>
  );
};
