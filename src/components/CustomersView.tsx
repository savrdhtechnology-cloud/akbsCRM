import React, { useState } from 'react';
import {
  Search,
  Plus,
  MapPin,
  Building2,
  Phone,
  Mail,
  Award,
  Calendar,
  Activity,
  Download,
  Filter
} from 'lucide-react';
import { Customer } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  onOpenAddCustomer: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onOpenAddCustomer
}) => {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.farmName.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase());
    const matchesState = stateFilter === 'All' || c.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const totalBirdsCapacity = customers.reduce((sum, c) => sum + c.capacity, 0);
  const activeBirdsCount = customers.reduce((sum, c) => sum + c.currentBatchBirds, 0);

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Top Banner & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Registered Customers & Farms
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            18 operational commercial broiler and layer poultry units under AKBS management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Customer Farm</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Registered Farms</span>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{customers.length}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Bird Capacity</span>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
            {totalBirdsCapacity.toLocaleString()} Birds
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Current Active Flocks</span>
          <div className="text-lg font-bold text-blue-700 font-mono mt-0.5">
            {activeBirdsCount.toLocaleString()} Live Birds
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Avg Batches / Year</span>
          <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">
            5.8 Cycles
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farm name, owner, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">All States</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Chhattisgarh">Chhattisgarh</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Haryana">Haryana</option>
            <option value="Bihar">Bihar</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Punjab">Punjab</option>
          </select>
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const occupancyRate = cust.capacity > 0 ? Math.round((cust.currentBatchBirds / cust.capacity) * 100) : 0;

          return (
            <div
              key={cust.id}
              onClick={() => setSelectedCustomer(cust)}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{cust.farmName}</h3>
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                      <span>Owner: {cust.name}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    cust.status === 'Batch In Progress' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : cust.status === 'Harvesting'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : cust.status === 'Under Maintenance'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {cust.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-2">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{cust.location}, {cust.state}</span>
                </div>

                {/* Progress bar of current birds vs capacity */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Live Birds:</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {cust.currentBatchBirds.toLocaleString()} / {cust.capacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${occupancyRate > 90 ? 'bg-emerald-600' : occupancyRate > 50 ? 'bg-blue-600' : 'bg-amber-500'}`}
                      style={{ width: `${occupancyRate}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Occupancy {occupancyRate}%</span>
                    <span>{cust.batchesCompleted} Batches Sold</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shed Type:</span>
                    <span className="font-medium text-slate-800">{cust.shedType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Integration:</span>
                    <span className="font-medium text-slate-800">{cust.integrationPartner}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-600">{cust.phone}</span>
                <span className="text-[10px] text-slate-400 font-mono">Registered: {cust.joinedDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div><h2 className="text-base font-bold text-slate-900">{selectedCustomer.farmName}</h2><p className="text-xs text-emerald-800 font-semibold">{selectedCustomer.name}</p></div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Phone</span><div className="font-mono font-bold">{selectedCustomer.phone}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Email</span><div className="font-semibold break-all">{selectedCustomer.email}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Location</span><div className="font-semibold">{selectedCustomer.location}, {selectedCustomer.state}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Capacity</span><div className="font-mono font-bold">{selectedCustomer.capacity.toLocaleString()} Birds</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Shed Type</span><div className="font-semibold">{selectedCustomer.shedType}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Status</span><div className="font-semibold">{selectedCustomer.status}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Current Flock</span><div className="font-mono font-bold">{selectedCustomer.currentBatchBirds.toLocaleString()}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Batches Completed</span><div className="font-mono font-bold">{selectedCustomer.batchesCompleted}</div></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <a href={`tel:${selectedCustomer.phone}`} className="px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg font-bold text-xs">Call</a>
              <a href={`mailto:${selectedCustomer.email}`} className="px-3 py-2 bg-[#0b2818] text-white rounded-lg font-bold text-xs">Email</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
