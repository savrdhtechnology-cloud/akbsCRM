'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowDown, ArrowUp, Bird, Leaf, type LucideIcon} from 'lucide-react';
import {avatarColor, initials} from './metrics';

type IconType = LucideIcon;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Animates from the previous value to the new value whenever real data changes. */
export function CountUp({value, duration = 900}: {value: number; duration?: number}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { setShown(value); from.current = value; return; }
    const start = performance.now(), a = from.current ?? 0;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);
  return <>{shown.toLocaleString('en-IN')}</>;
}

export function Sparkline({values, color}: {values: number[]; color: string}) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${30 - (v / max) * 26}`).join(' ');
  return <svg className="pc-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={1}/>
  </svg>;
}

export function Delta({value}: {value: number | null}) {
  if (value === null) return <span className="pc-delta muted">No prior period</span>;
  const down = value < 0;
  return <span className={`pc-delta ${down ? 'down' : 'up'}`}>{down ? <ArrowDown size={13}/> : <ArrowUp size={13}/>}{Math.abs(value)}%<small>vs last 30d</small></span>;
}

export type Kpi = {label: string; value: number; display?: string; icon: IconType; tone: string; delta?: number | null; series?: number[]; onClick?: () => void; active?: boolean};

export function KpiCards({items, compact = false}: {items: Kpi[]; compact?: boolean}) {
  return <div className={`pc-kpis ${compact ? 'compact' : ''}`}>
    {items.map((k, i) => {
      const Icon = k.icon;
      return <button key={k.label} type="button" onClick={k.onClick} className={`pc-kpi ${k.active ? 'active' : ''}`} style={{['--tone' as string]: k.tone, animationDelay: `${i * 70}ms`}} aria-pressed={k.active}>
        <span className="pc-kpi-icon"><Icon size={compact ? 20 : 24}/></span>
        <span className="pc-kpi-body">
          <span className="pc-kpi-label">{k.label}</span>
          <strong className="pc-kpi-value">{k.display ?? <CountUp value={k.value}/>}</strong>
          {k.delta !== undefined && <Delta value={k.delta}/>}
        </span>
        {k.series && !compact && <Sparkline values={k.series} color={k.tone}/>}
      </button>;
    })}
  </div>;
}

export function PremiumHero({crumb, title, subtitle, children, actions}: {crumb: string; title: string; subtitle: string; children?: ReactNode; actions?: ReactNode}) {
  return <section className="pc-hero">
    <div className="pc-hero-bg" aria-hidden><span className="pc-hero-img"/><span className="pc-hero-rooster"/><span className="pc-hero-sweep"/></div>
    <div className="pc-hero-head">
      <div className="pc-hero-copy">
        <span className="pc-crumb">◈ {crumb}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="pc-hero-actions">{actions}</div>}
    </div>
    {children}
  </section>;
}

export function ChartCard({title, icon: Icon, badge, children, className = '', action}: {title: ReactNode; icon?: IconType; badge?: ReactNode; children: ReactNode; className?: string; action?: ReactNode}) {
  return <section className={`pc-card pc-chart ${className}`}>
    <header className="pc-card-head"><h3>{Icon && <Icon size={18}/>}{title}</h3>{badge}{action}</header>
    {children}
  </section>;
}

export function TrendChart({series, compare, labels}: {series: number[]; compare?: number[]; labels: string[]}) {
  const max = Math.max(4, ...series, ...(compare || []));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const ticks = [4, 3, 2, 1, 0].map(i => i * step);
  const x = (i: number) => (i / Math.max(1, series.length - 1)) * 100;
  const y = (v: number) => 100 - (v / top) * 100;
  const line = (vals: number[]) => vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(labels.length / 8));
  return <div className="pc-trend">
    <div className="pc-trend-y">{ticks.map(t => <span key={t}>{t}</span>)}</div>
    <div className="pc-trend-plot">
      {ticks.map(t => <i key={t} className="pc-gridline" style={{top: `${y(t)}%`}}/>)}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs><linearGradient id="pcArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f5c451" stopOpacity=".45"/><stop offset="1" stopColor="#f5c451" stopOpacity="0"/></linearGradient></defs>
        <polygon className="pc-area" points={`0,100 ${line(series)} 100,100`} fill="url(#pcArea)"/>
        <polyline className="pc-line" points={line(series)} fill="none" stroke="#f5c451" strokeWidth="2.4" vectorEffect="non-scaling-stroke" pathLength={1}/>
        {compare && <polyline className="pc-line late" points={line(compare)} fill="none" stroke="#8b5cf6" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength={1}/>}
      </svg>
      {series.map((v, i) => <span key={i} className="pc-dot" style={{left: `${x(i)}%`, top: `${y(v)}%`, animationDelay: `${300 + i * 40}ms`}}><b>{labels[i]}: {v} lead{v === 1 ? '' : 's'}{compare ? ` · ${compare[i]} converted` : ''}</b></span>)}
      {compare?.map((v, i) => <span key={'c' + i} className="pc-dot violet" style={{left: `${x(i)}%`, top: `${y(v)}%`}}/>)}
    </div>
    <div className="pc-trend-x">{labels.map((l, i) => <span key={i} style={{left: `${x(i)}%`}}>{i % labelEvery === 0 || i === labels.length - 1 ? l : ''}</span>)}</div>
  </div>;
}

export function Donut({rows, total, caption}: {rows: {key: string; value: number; color: string}[]; total: number; caption: string}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t); }, []);
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return <div className="pc-donut-wrap">
    <div className="pc-donut">
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="18"/>
        {rows.map(d => {
          const len = total ? (d.value / total) * c : 0;
          const el = <circle key={d.key} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${ready ? Math.max(0, len - 1.5) : 0} ${c}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)"/>;
          acc += len; return el;
        })}
      </svg>
      <div className="pc-donut-center"><strong><CountUp value={total}/></strong><span>{caption}</span></div>
    </div>
    <ul className="pc-legend">{rows.map(d => <li key={d.key}><i style={{background: d.color}}/>{d.key}<span>{d.value} <small>({total ? ((d.value / total) * 100).toFixed(1) : '0.0'}%)</small></span></li>)}</ul>
  </div>;
}

export function Funnel({steps}: {steps: {key: string; value: number; pct: number}[]}) {
  const colors = ['#3b82f6', '#2f6bd8', '#e8a925', '#22a55a'];
  return <div className="pc-funnel">{steps.map((s, i) => <div key={s.key} className="pc-funnel-row">
    <div className="pc-funnel-track"><i style={{width: `${Math.max(s.pct, s.value ? 3 : 0)}%`, background: colors[i], animationDelay: `${i * 120}ms`}}/><span>{s.key} ({s.value})</span></div>
    <b>{s.pct}%</b>
  </div>)}</div>;
}

export function Avatar({name, size = 36}: {name: string; size?: number}) {
  return <span className="pc-avatar" style={{width: size, height: size, background: avatarColor(name), fontSize: size * 0.34}}>{initials(name)}</span>;
}

export function StatusPill({value, kind = 'status'}: {value: string; kind?: 'status' | 'reg' | 'priority' | 'neutral'}) {
  const v = value.toLowerCase().replace(/\s+/g, '-');
  return <span className={`pc-pill pc-${kind} v-${v}`}><i/>{value}</span>;
}

export function EmptyState({title, text, action}: {title: string; text: string; action?: ReactNode}) {
  return <div className="pc-empty"><span className="pc-empty-art" aria-hidden/><strong>{title}</strong><p>{text}</p>{action}</div>;
}

export function Skeleton({rows = 6}: {rows?: number}) {
  return <div className="pc-skeleton" aria-busy="true" aria-label="Loading">{Array.from({length: rows}, (_, i) => <i key={i} style={{animationDelay: `${i * 80}ms`}}/>)}</div>;
}

/** Official AKBS mark, same as the website header: green roundel, gold leaf, gold bird badge. */
export function AkbsMark({size = 52}: {size?: number}) {
  return <span className="pc-akbs-mark" style={{width: size, height: size}} aria-hidden>
    <Leaf size={Math.round(size * 0.5)} strokeWidth={2.5}/>
    <i><Bird size={Math.round(size * 0.22)} strokeWidth={3}/></i>
  </span>;
}
