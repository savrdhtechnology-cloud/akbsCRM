import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Phone,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Filter
} from 'lucide-react';
import { FollowUp } from '../types';

interface FollowUpsViewProps {
  followUps: FollowUp[];
  onOpenAddFollowUp: () => void;
  onToggleStatus: (id: string) => void;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  followUps,
  onOpenAddFollowUp,
  onToggleStatus
}) => {
  const [tab, setTab] = useState<'all' | 'pending' | 'completed'>('all');

  const filtered = followUps.filter(f => {
    if (tab === 'pending') return f.status === 'Pending';
    if (tab === 'completed') return f.status === 'Completed';
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Follow-ups & Site Visits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage scheduled calls, technical site feasibility visits, and proposal discussions
          </p>
        </div>

        <button
          onClick={onOpenAddFollowUp}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('all')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
            tab === 'all' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Scheduled ({followUps.length})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
            tab === 'pending' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending ({followUps.filter(f => f.status === 'Pending').length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
            tab === 'completed' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed ({followUps.filter(f => f.status === 'Completed').length})
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          let priorityClass = 'bg-amber-100 text-amber-800';
          if (item.priority === 'High') priorityClass = 'bg-rose-100 text-rose-800';
          if (item.priority === 'Low') priorityClass = 'bg-emerald-100 text-emerald-800';

          return (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggleStatus(item.id)}
                  className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    item.status === 'Completed'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-emerald-500 bg-white'
                  }`}
                >
                  {item.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${item.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {item.leadName}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.type}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityClass}`}>
                      {item.priority} Priority
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1">{item.notes}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {item.scheduledDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.scheduledTime}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {item.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <a
                  href={`tel:${item.phone}`}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  Call Now
                </a>
                <button
                  onClick={() => onToggleStatus(item.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  {item.status === 'Completed' ? 'Mark Pending' : 'Mark Done'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
