import React from 'react';
import {
  TrendingUp,
  Award,
  Users,
  Building,
  DollarSign,
  PieChart,
  BarChart3
} from 'lucide-react';
import { Lead, Customer } from '../types';

interface ReportsViewProps {
  leads: Lead[];
  customers: Customer[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ leads, customers }) => {
  const convertedCount = leads.filter(l => l.status === 'Converted').length;
  const conversionRate = Math.round((convertedCount / leads.length) * 100);
  const totalCapacity = customers.reduce((acc, c) => acc + c.capacity, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Reports & Business Intelligence
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Poultry farm conversion velocity, marketing channel ROI, and flock capacity distribution
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Lead-to-Farm Conversion</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">{conversionRate}%</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">5 Converted / 48 Total</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Operational Bird Sheds</span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{customers.length} Farms</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Spread across 6 states</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Aggregated Live Capacity</span>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1">
            {totalCapacity.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Birds Per Cycle</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Pipeline Capital Value</span>
          <div className="text-2xl font-bold text-amber-700 font-mono mt-1">₹ 2.45 Cr</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Proposals in active pipeline</span>
        </div>
      </div>

      {/* Regional breakdown table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Geographic Distribution of Farms</h2>
        <div className="space-y-3">
          {[
            { state: 'Madhya Pradesh (Indore, Bhopal, Gwalior, Dewas)', count: 6, birds: '98,000 birds', pct: 31 },
            { state: 'Rajasthan (Jaipur, Ajmer, Nagaur, Bhilwara)', count: 5, birds: '105,000 birds', pct: 33 },
            { state: 'Chhattisgarh (Raipur, Bilaspur, Bhilai, Rajnandgaon)', count: 4, birds: '69,000 birds', pct: 22 },
            { state: 'Haryana & Punjab (Gurugram, Rewari, Ludhiana)', count: 2, birds: '46,000 birds', pct: 14 }
          ].map((region) => (
            <div key={region.state} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800">{region.state}</span>
                <span className="font-mono text-slate-600 font-bold">{region.birds} ({region.count} units)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${region.pct}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
