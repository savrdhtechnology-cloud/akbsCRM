import React, { useState } from 'react';
import {
  Search,
  Plus,
  Handshake,
  Star,
  MapPin,
  Phone,
  Mail,
  Building,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { Partner } from '../types';

interface PartnersViewProps {
  partners: Partner[];
  onOpenAddPartner: () => void;
}

export const PartnersView: React.FC<PartnersViewProps> = ({
  partners,
  onOpenAddPartner
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filtered = partners.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Strategic Business Partners
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Equipment manufacturers, feed mills, hatcheries, banks and processing off-takers
          </p>
        </div>

        <button
          onClick={onOpenAddPartner}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add New Partner</span>
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
            placeholder="Search partner, contact person, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">All Categories</option>
            <option value="Equipment & Automation">Equipment & Automation</option>
            <option value="Feed Supplier">Feed Supplier</option>
            <option value="Hatchery / DOC">Hatchery / DOC</option>
            <option value="Veterinary & Pharma">Veterinary & Pharma</option>
            <option value="Bank / NBFC Partner">Bank / NBFC Partner</option>
            <option value="Processing & Meat Off-taker">Processing & Meat Off-taker</option>
          </select>
        </div>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((partner) => (
          <div
            key={partner.id}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                    {partner.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1.5">{partner.name}</h3>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 text-amber-700 text-xs font-bold">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{partner.rating}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{partner.contactPerson}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{partner.location}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{partner.phone}</span>
                </div>
              </div>

              <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Margin / Commission:</span>
                <span className="font-bold text-emerald-800">{partner.commissionRate}</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{partner.status}</span>
              </span>
              <a 
                href={`tel:${partner.phone}`}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
              >
                Contact Partner
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
