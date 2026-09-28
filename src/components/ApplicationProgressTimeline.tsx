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
  orientation?: 'horizontal' | 'vertical';
  footer?: React.ReactNode;
};

const ringColor: Record<ProgressStage['status'], string> = {
  completed: '#059669',
  in_progress: '#10b981',
  pending: '#cbd5e1',
  locked: '#cbd5e1',
  action_required: '#d97706'
};

function ProgressRing({ stage, size = 64, delay = 0 }: { stage: ProgressStage; size?: number; delay?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.max(0, Math.min(stage.percentage, 100)) / 100) * circumference;
  return (
    <div
      className={`relative shrink-0 motion-safe:animate-[timelinePop_.55s_ease-out_both] ${stage.status === 'in_progress' ? 'motion-safe:animate-pulse' : ''}`}
      style={{width:size,height:size, animationDelay:`${delay}ms`}}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="white" stroke="#e2e8f0" strokeWidth={stroke}/>
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={ringColor[stage.status]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-safe:animate-[ringDraw_1s_ease-out_both]"
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
  orientation='horizontal',
  footer
}) => {
  const overall=overallProgress(stages);
  const active=stages.find(s=>s.id===activeStageId) || stages.find(s=>s.status==='in_progress') || stages.find(s=>s.status==='pending') || stages[stages.length-1];

  if (orientation === 'vertical') {
    return (
      <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">{title}</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-4">{subtitle}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
              <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Overall</div>
              <div className="text-xl font-black text-emerald-800 leading-none mt-1">{overall}%</div>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <div className="absolute left-[22px] top-7 bottom-7 w-0.5 bg-slate-200" />
            <div
              className="absolute left-[22px] top-7 w-0.5 bg-emerald-500 transition-all duration-700"
              style={{height: `${Math.max(0, Math.min(overall, 100))}%`}}
            />
            <div className="space-y-2.5">
              {stages.map((stage,index)=>{
                const isActive=active?.id===stage.id;
                const disabled=readOnly || stage.status==='locked';
                return (
                  <button
                    key={stage.id}
                    type="button"
                    disabled={disabled}
                    onClick={()=>!disabled&&onStageClick?.(stage)}
                    className={`relative z-10 w-full text-left rounded-xl p-2.5 pl-2 flex items-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${disabled?'cursor-default':'cursor-pointer hover:bg-emerald-50/60'} ${isActive?'bg-emerald-50 ring-1 ring-emerald-200':''}`}
                  >
                    <div className={`w-11 h-11 rounded-full border-[3px] bg-white shrink-0 grid place-items-center shadow-sm ${stage.status==='completed'?'border-emerald-600':stage.status==='in_progress'?'border-emerald-500':stage.status==='action_required'?'border-amber-500':'border-slate-300'}`}>
                      {stage.status === 'completed' ? <Check className="w-5 h-5 text-emerald-700" /> :
                       stage.status === 'locked' ? <Lock className="w-4 h-4 text-slate-400" /> :
                       stage.status === 'action_required' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                       <span className="text-[10px] font-black text-slate-700">{stage.percentage}%</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[9px] font-bold text-slate-400">{String(index+1).padStart(2,'0')}</div>
                        <div className="text-[9px] font-black text-slate-500">{stage.percentage}%</div>
                      </div>
                      <div className="text-[11px] font-black text-slate-900 leading-tight mt-0.5">{stage.title}</div>
                      <div className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[8px] font-bold ${stage.status==='completed'?'bg-emerald-100 text-emerald-800':stage.status==='in_progress'?'bg-emerald-100 text-emerald-700':stage.status==='action_required'?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-500'}`}>
                        {stage.status==='completed'?'Completed':stage.status==='in_progress'?'In Progress':stage.status==='action_required'?'Action Required':stage.status==='locked'?'Locked':'Pending'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {active && (
          <div className="mx-3 mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Current Stage</div>
            <div className="text-xs font-black text-slate-950 mt-1">{active.title}</div>
            <div className="text-[10px] text-slate-500 mt-1 leading-4">{active.description}</div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-700" style={{width:`${active.percentage}%`}} />
            </div>
            {active.totalRequiredFields ? (
              <div className="text-[9px] text-slate-400 mt-1.5">{active.completedFields || 0} of {active.totalRequiredFields} required items completed</div>
            ) : null}
            {!readOnly && active.status!=='completed' && active.status!=='locked' && onStageClick && (
              <button type="button" onClick={()=>onStageClick(active)} className="mt-2 h-8 px-3 rounded-lg bg-[#0b3824] text-white text-[10px] font-bold flex items-center gap-1.5">
                Continue <ChevronRight className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>
        )}
        {footer}
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] overflow-hidden">
      <style>{`
        @keyframes timelinePop {
          0% { opacity: 0; transform: translateY(10px) scale(.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ringDraw {
          from { stroke-dashoffset: 180; }
        }
        @keyframes lineSweep {
          0% { transform: scaleX(0); opacity: .25; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes stageGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.08); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,.10); }
        }
      `}</style>
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-white to-emerald-50/30">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-950">{title}</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
          <ProgressRing stage={{id:'overall',title:'Overall',percentage:overall,status:overall===100?'completed':overall>0?'in_progress':'pending'}} size={56} delay={80}/>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Overall Progress</div>
            <div className="text-2xl font-black text-emerald-800 leading-none mt-1">{overall}%</div>
          </div>
        </div>
      </div>

      <div className={`relative overflow-x-auto ${compact?'p-3 sm:p-4':'p-4 sm:p-6'}`}>
        <div className="min-w-[780px] grid grid-cols-6 gap-4 relative">
          <div className="absolute left-[8%] right-[8%] top-[31px] h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full origin-left bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 motion-safe:animate-[lineSweep_1.2s_ease-out_both]"
              style={{width:`${Math.max(8, overall)}%`}}
            />
          </div>
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
                className={`relative z-10 text-center rounded-2xl p-2.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${disabled?'cursor-default':'cursor-pointer hover:bg-emerald-50/50 hover:-translate-y-0.5'} ${isActive?'bg-emerald-50 ring-1 ring-emerald-200 motion-safe:animate-[stageGlow_2.3s_ease-in-out_infinite]':''}`}
              >
                <div className="mx-auto w-fit">
                  <ProgressRing stage={stage} size={66} delay={120 + index * 110}/>
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-400">{String(index+1).padStart(2,'0')}</div>
                <div className="text-xs font-black text-slate-900 leading-tight min-h-9 flex items-center justify-center px-1">{stage.title}</div>
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
        <div className="mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Current Stage</div>
            <div className="text-base font-black text-slate-950 mt-1">{active.title}</div>
            <div className="text-[11px] text-slate-500 mt-1">{active.description}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden flex-1 min-w-[180px] max-w-xl">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out motion-safe:animate-[lineSweep_1s_ease-out_both]" style={{width:`${active.percentage}%`}}/>
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
