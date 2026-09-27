import React from 'react';
import { Check, Lock, AlertTriangle, Circle, ChevronRight } from 'lucide-react';
import type { ProgressStage } from '../lib/applicationProgress';
import { overallProgress } from '../lib/applicationProgress';

type Props = {
  title?: string;
  subtitle?: string;
  stages: ProgressStage[];
  activeStageId?: string;
  onStageClick?: (stage: ProgressStage) => void;
  readOnly?: boolean;
  compact?: boolean;
  footer?: React.ReactNode;
};

const ringColor: Record<ProgressStage['status'], string> = {
  completed: '#059669',
  in_progress: '#10b981',
  pending: '#cbd5e1',
  locked: '#cbd5e1',
  action_required: '#d97706'
};

function ProgressRing({ stage, size = 64 }: { stage: ProgressStage; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.max(0, Math.min(stage.percentage, 100)) / 100) * circumference;
  return (
    <div className={`relative shrink-0 ${stage.status === 'in_progress' ? 'motion-safe:animate-pulse' : ''}`} style={{width:size,height:size}}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="white" stroke="#e2e8f0" strokeWidth={stroke}/>
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={ringColor[stage.status]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {stage.status === 'completed' ? <Check className="w-6 h-6 text-emerald-700" /> :
         stage.status === 'locked' ? <Lock className="w-5 h-5 text-slate-400" /> :
         stage.status === 'action_required' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
         <span className="text-[13px] font-black text-slate-800">{stage.percentage}%</span>}
      </div>
    </div>
  );
}

export const ApplicationProgressTimeline: React.FC<Props> = ({
  title='Your Application Progress',
  subtitle='Complete each stage step by step. Progress updates automatically.',
  stages,
  activeStageId,
  onStageClick,
  readOnly=false,
  compact=false,
  footer
}) => {
  const overall=overallProgress(stages);
  const active=stages.find(s=>s.id===activeStageId) || stages.find(s=>s.status==='in_progress') || stages.find(s=>s.status==='pending') || stages[stages.length-1];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-950">{title}</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
          <ProgressRing stage={{id:'overall',title:'Overall',percentage:overall,status:overall===100?'completed':overall>0?'in_progress':'pending'}} size={54}/>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Overall Progress</div>
            <div className="text-2xl font-black text-emerald-800 leading-none mt-1">{overall}%</div>
          </div>
        </div>
      </div>

      <div className={`relative overflow-x-auto ${compact?'p-3':'p-4 sm:p-5'}`}>
        <div className="min-w-[760px] grid grid-cols-6 gap-3 relative">
          <div className="absolute left-[8%] right-[8%] top-[31px] h-0.5 bg-slate-200" />
          {stages.map((stage,index)=>{
            const isActive=active?.id===stage.id;
            const disabled=readOnly || stage.status==='locked';
            return (
              <button
                key={stage.id}
                type="button"
                disabled={disabled}
                onClick={()=>!disabled&&onStageClick?.(stage)}
                aria-label={`${stage.title}: ${stage.percentage}% ${stage.status.replace('_',' ')}`}
                className={`relative z-10 text-center rounded-xl p-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${disabled?'cursor-default':'cursor-pointer hover:bg-emerald-50/50'} ${isActive?'bg-emerald-50/70':''}`}
              >
                <div className="mx-auto w-fit">
                  <ProgressRing stage={stage} size={64}/>
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-400">{String(index+1).padStart(2,'0')}</div>
                <div className="text-xs font-black text-slate-900 leading-tight min-h-8 flex items-center justify-center">{stage.title}</div>
                <div className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${stage.status==='completed'?'bg-emerald-100 text-emerald-800':stage.status==='in_progress'?'bg-emerald-50 text-emerald-700':stage.status==='action_required'?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-500'}`}>
                  {stage.status==='completed'?'Completed':stage.status==='in_progress'?'In Progress':stage.status==='action_required'?'Action Required':stage.status==='locked'?'Locked':'Pending'}
                </div>
                <div className="mt-1 text-[10px] font-black text-slate-600">{stage.percentage}%</div>
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Current Stage</div>
            <div className="text-base font-black text-slate-950 mt-1">{active.title}</div>
            <div className="text-[11px] text-slate-500 mt-1">{active.description}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex-1 min-w-[180px] max-w-xl">
                <div className="h-full bg-emerald-600 transition-all duration-700" style={{width:`${active.percentage}%`}}/>
              </div>
              <div className="text-xs font-black text-emerald-800">{active.percentage}%</div>
            </div>
            {active.totalRequiredFields ? (
              <div className="text-[10px] text-slate-400 mt-1">{active.completedFields || 0} of {active.totalRequiredFields} required items completed</div>
            ) : null}
          </div>
          {!readOnly && active.status!=='completed' && active.status!=='locked' && onStageClick && (
            <button type="button" onClick={()=>onStageClick(active)} className="h-10 px-4 rounded-xl bg-[#0b3824] text-white text-xs font-bold flex items-center gap-2 self-start md:self-auto">
              Continue <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
      )}
      {footer}
    </section>
  );
};
