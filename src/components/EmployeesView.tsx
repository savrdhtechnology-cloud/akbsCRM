import React, { useState } from 'react';
import {
  UserCog,
  Plus,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Employee } from '../types';

interface EmployeesViewProps {
  employees: Employee[];
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ employees }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            AKBS Operations & Field Staff
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Technical supervisors, poultry project consultants, veterinary doctors, and sales team
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.id}
            onClick={() => setSelectedEmployee(emp)}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0b2818] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                  <div className="text-xs font-semibold text-emerald-800">{emp.role}</div>
                  <div className="text-[10px] text-slate-400">{emp.department}</div>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {emp.status}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600 font-mono">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{emp.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-sans text-[11px] truncate">{emp.email}</span>
              </div>
            </div>

            <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Pipeline Leads:</span>
              <span className="font-mono font-bold text-slate-900">{emp.activeLeadsCount} Leads</span>
            </div>
          </div>
        ))}
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedEmployee(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between pb-3 border-b border-slate-100">
              <div><h2 className="font-bold text-slate-900">{selectedEmployee.name}</h2><div className="text-xs text-emerald-800 font-semibold">{selectedEmployee.role}</div></div>
              <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Department</span><div className="font-bold">{selectedEmployee.department}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Status</span><div className="font-bold">{selectedEmployee.status}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Phone</span><div className="font-mono font-bold">{selectedEmployee.phone}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400">Email</span><div className="font-semibold break-all">{selectedEmployee.email}</div></div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2"><span className="text-slate-400">Active Leads</span><div className="font-mono font-bold">{selectedEmployee.activeLeadsCount}</div></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <a href={`tel:${selectedEmployee.phone}`} className="px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg font-bold text-xs">Call</a>
              <a href={`mailto:${selectedEmployee.email}`} className="px-3 py-2 bg-[#0b2818] text-white rounded-lg font-bold text-xs">Email</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
