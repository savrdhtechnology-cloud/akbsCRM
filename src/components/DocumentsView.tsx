import React, { useState } from 'react';
import {
  FolderLock,
  Plus,
  FileText,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { DocumentRecord } from '../types';

interface DocumentsViewProps {
  documents: DocumentRecord[];
  onOpenUpload: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onOpenUpload
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filtered = documents.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.relatedEntity.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Central Document Repository
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Land 7/12 records, State Pollution Control Board NOCs, 3-phase electricity sanctions, and DPR files
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document name or farmer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="All">All Categories</option>
          <option value="Land 7/12 Records">Land 7/12 Records</option>
          <option value="Electricity Sanction">Electricity Sanction</option>
          <option value="Pollution NOC">Pollution NOC</option>
          <option value="DPR Report">DPR Report</option>
          <option value="Bank Sanction">Bank Sanction</option>
          <option value="Architect Drawing">Architect Drawing</option>
        </select>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Farmer / Beneficiary</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Date Uploaded</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold text-slate-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{doc.category}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{doc.relatedEntity}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">{doc.fileSize}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">{doc.uploadDate}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      doc.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => alert(`Downloading ${doc.name}`)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
