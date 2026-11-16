import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Globe2, MapPin, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { useCrm } from '../lib/crm';

type DailyPoint = { date: string; views: number };
type PageRow = { path: string; views: number; visitors: number };
type BreakdownRow = { label: string; visits: number };
type LocationRow = { city: string; region: string; country: string; latitude: number | null; longitude: number | null; views: number; visitors: number };
type RecentVisit = { at: string; path: string; source: string; device: string; city?: string; country?: string };
type Analytics = {
  totalViews: number; uniqueVisitors: number; activeNow: number; totalPages: number;
  lifetimeViews: number; lifetimeVisitors: number; trackingSince: string | null;
  daily: DailyPoint[]; pages: PageRow[]; sources: BreakdownRow[]; devices: BreakdownRow[];
  locations: LocationRow[]; recent: RecentVisit[];
};
const empty: Analytics = { totalViews: 0, uniqueVisitors: 0, activeNow: 0, totalPages: 0, lifetimeViews: 0, lifetimeVisitors: 0, trackingSince: null, daily: [], pages: [], sources: [], devices: [], locations: [], recent: [] };
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const dateTime = (value: string) => { const date = new Date(value); return Number.isNaN(+date) ? '—' : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const prettyPath = (value: string) => value === '/' ? 'Home' : value;
const deviceIcon = (device: string) => device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
const MAP_W = 1000, MAP_H = 430;
const project = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H });
const hq = project(23.2599, 77.4126);
const continents = [
  'M70 105 L108 70 175 55 218 76 244 70 266 94 250 119 224 129 216 154 190 168 185 198 160 207 144 185 120 174 113 151 92 139 Z',
  'M226 214 L248 225 260 257 251 287 266 319 252 355 234 376 222 346 211 324 215 294 199 273 208 244 Z',
  'M424 104 L449 82 485 77 506 89 501 108 480 117 465 136 448 126 Z',
  'M451 142 L481 128 509 140 528 166 521 203 505 238 494 274 476 297 462 267 455 234 441 205 439 171 Z',
  'M510 101 L543 84 575 88 601 78 631 90 664 81 701 95 740 91 783 111 818 105 846 124 878 130 905 155 886 176 853 173 831 190 799 185 780 203 747 194 722 211 693 200 678 179 654 174 632 153 601 155 580 137 557 135 538 120 Z',
  'M770 249 L800 242 831 252 849 271 838 290 814 296 791 284 778 266 Z',
  'M900 302 L927 295 949 310 944 329 916 331 899 320 Z',
];
const geoText = (location: LocationRow) => [location.city, location.region, location.country].filter(Boolean).join(', ');

export function WebsiteVisitorsView() {
  const { websiteAnalytics } = useCrm();
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Analytics>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await websiteAnalytics('summary', { days: range });
      setData({
        totalViews: Number(result?.totalViews || 0), uniqueVisitors: Number(result?.uniqueVisitors || 0),
        activeNow: Number(result?.activeNow || 0), totalPages: Number(result?.totalPages || 0),
        lifetimeViews: Number(result?.lifetimeViews || 0), lifetimeVisitors: Number(result?.lifetimeVisitors || 0),
        trackingSince: typeof result?.trackingSince === 'string' ? result.trackingSince : null,
        daily: Array.isArray(result?.daily) ? result.daily : [], pages: Array.isArray(result?.pages) ? result.pages : [],
        sources: Array.isArray(result?.sources) ? result.sources : [], devices: Array.isArray(result?.devices) ? result.devices : [],
        locations: Array.isArray(result?.locations) ? result.locations : [], recent: Array.isArray(result?.recent) ? result.recent : [],
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Visitor analytics could not be loaded.'); }
    finally { setLoading(false); }
  }, [websiteAnalytics, range]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000); return () => window.clearInterval(timer); }, [load]);

  const maxViews = Math.max(1, ...data.daily.map(point => Number(point.views) || 0));
  const maxSource = Math.max(1, ...data.sources.map(row => Number(row.visits) || 0));
  const maxDevice = Math.max(1, ...data.devices.map(row => Number(row.visits) || 0));
  const mappedLocations = data.locations.filter(row => Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
  const sinceDate = data.trackingSince ? new Date(data.trackingSince).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'waiting for first visit';
  const IconActive = Activity;

  return <section className="pc-page pc-visitors" aria-labelledby="website-visitors-title">
    <div className="pc-visitors-toolbar">
      <div><h2 id="website-visitors-title">Website traffic</h2><p>Anonymous analytics with approximate IP-based city locations. Map points are estimates, not exact addresses.</p></div>
      <div className="pc-visitors-controls">
        <label className="pc-visitors-range">Date range<select className="pc-select" value={range} onChange={event => setRange(Number(event.target.value))} aria-label="Website visitor date range"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
        <button className="pc-btn" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'pc-visitors-spin' : ''}/>Refresh</button>
      </div>
    </div>
    {error && <div className="pc-visitors-error" role="alert"><strong>Analytics connection unavailable</strong><span>{error}</span><small>Check the website analytics database migration and reload.</small></div>}
    <div className="pc-kpis compact pc-visitors-kpis" aria-live="polite">
      <article className="pc-kpi" style={{'--tone':'#22d3ee'} as React.CSSProperties}><span className="pc-kpi-icon"><Eye size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Page views · selected period</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.totalViews)}</strong></div></article>
      <article className="pc-kpi" style={{'--tone':'#8b5cf6'} as React.CSSProperties}><span className="pc-kpi-icon"><Users size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Unique visitors · selected period</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.uniqueVisitors)}</strong></div></article>
      <article className="pc-kpi" style={{'--tone':'#34d399'} as React.CSSProperties}><span className="pc-kpi-icon"><Activity size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Active now</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.activeNow)}</strong></div></article>
      <article className="pc-kpi" style={{'--tone':'#a78bfa'} as React.CSSProperties}><span className="pc-kpi-icon"><Globe2 size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Pages visited</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.totalPages)}</strong></div></article>
      <article className="pc-kpi pc-kpi-lifetime" style={{'--tone':'#fbbf24'} as React.CSSProperties}><span className="pc-kpi-icon"><Eye size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">All-time views since tracking began</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.lifetimeViews)}</strong><small>From {sinceDate}</small></div></article>
      <article className="pc-kpi pc-kpi-lifetime" style={{'--tone':'#fb7185'} as React.CSSProperties}><span className="pc-kpi-icon"><Users size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">All-time unique visitors</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.lifetimeVisitors)}</strong><small>Since analytics activation</small></div></article>
    </div>
    <article className="pc-card pc-visitors-map-card">
      <header className="pc-card-head"><h3><Globe2 size={18}/>Visitor locations <small>{compact.format(data.locations.reduce((sum, row) => sum + Number(row.views || 0), 0))} located views · IP-based estimates</small></h3><span className="pc-visitors-hq-pill"><MapPin size={14}/>Head office · Bhopal</span></header>
      <div className="pc-visitors-map-wrap">
        <svg className="pc-visitors-world-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Visitor locations and flow to AKBS head office in Bhopal. ${mappedLocations.length} mapped locations.`}>
          <defs><linearGradient id="akbs-flow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient><radialGradient id="akbs-hq-glow"><stop offset="0%" stopColor="#c4b5fd" stopOpacity=".42"/><stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/></radialGradient></defs>
          {continents.map((path,index)=><path key={index} d={path} className="pc-visitors-continent"/>)}
          {mappedLocations.slice(0,40).map((location,index)=>{const point=project(Number(location.latitude),Number(location.longitude));const curveY=Math.min(point.y,hq.y)-Math.max(22,Math.abs(point.x-hq.x)*.08);return <g key={`${location.city}-${location.country}-${index}`}><path className="pc-visitors-route" d={`M ${point.x} ${point.y} Q ${(point.x+hq.x)/2} ${curveY} ${hq.x} ${hq.y}`}/><circle className="pc-visitors-dot-halo" cx={point.x} cy={point.y} r={Math.min(11,5+Math.log2(Number(location.views||1)))}><title>{geoText(location)} · {location.views} page views</title></circle><circle className="pc-visitors-dot" cx={point.x} cy={point.y} r={Math.min(6,2.8+Math.log2(Number(location.views||1))*.6)}><title>{geoText(location)} · {location.visitors} visitors</title></circle></g>})}
          <circle cx={hq.x} cy={hq.y} r="34" fill="url(#akbs-hq-glow)"/><circle cx={hq.x} cy={hq.y} r="9" className="pc-visitors-hq-ring"/><circle cx={hq.x} cy={hq.y} r="4" className="pc-visitors-hq-dot"/><text x={hq.x+15} y={hq.y+4} className="pc-visitors-hq-label">Bhopal · HQ</text>
        </svg>
        {!mappedLocations.length && <div className="pc-visitors-map-empty">{loading ? 'Loading visitor locations…' : 'Visitor locations will appear here as new website visits are recorded.'}</div>}
      </div>
      <footer className="pc-visitors-map-legend"><span><i className="pc-legend-hq"/>Bhopal head office</span><span><i className="pc-legend-visitor"/>Approximate visitor city</span><span><i className="pc-legend-flow"/>Flow to HQ</span></footer>
    </article>
    <div className="pc-grid-2 pc-visitors-main-grid">
      <article className="pc-card"><header className="pc-card-head"><h3><Activity size={18}/>Traffic trend <small>Last {range} days</small></h3></header>
        {data.daily.length ? <div className="pc-visitors-chart" role="img" aria-label={data.daily.map(point => `${point.date}: ${point.views} visits`).join('; ')}>{data.daily.map(point => <div className="pc-visitors-chart-col" key={point.date} title={`${point.date}: ${point.views} page views`}><span style={{height:`${Math.max(3,Number(point.views)/maxViews*100)}%`}}/><small>{new Date(point.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</small></div>)}</div> : <div className="pc-visitors-empty">{loading ? 'Loading real visitor data…' : 'No visitor events recorded for this period.'}</div>}
      </article>
      <article className="pc-card pc-visitors-live"><header className="pc-card-head"><h3><Activity size={18}/>Live traffic <small>Recent visits</small></h3><span className="pc-visitors-live-dot" aria-label="Refreshes every 30 seconds"/></header>
        {data.recent.length ? <ul className="pc-visitors-live-list">{data.recent.slice(0,8).map((visit,index)=>{const Device=deviceIcon(visit.device);const place=[visit.city,visit.country].filter(Boolean).join(', ');return <li key={visit.at+visit.path+index}><span className="pc-visitors-device"><Device size={16}/></span><span className="pc-visitors-live-copy"><b>{prettyPath(visit.path)}</b><small>{place || visit.source || 'Location unavailable'} · {visit.device || 'unknown'}</small></span><time>{dateTime(visit.at)}</time></li>})}</ul> : <div className="pc-visitors-empty">{loading ? 'Loading recent visits…' : 'New website visits will appear here.'}</div>}
      </article>
    </div>
    <div className="pc-grid-2 pc-visitors-breakdowns">
      <article className="pc-card"><header className="pc-card-head"><h3><Globe2 size={18}/>Top pages</h3></header>{data.pages.length ? <div className="pc-visitors-rank-list">{data.pages.slice(0,8).map((page,index)=><div className="pc-visitors-rank" key={page.path}><div><span>{index+1}. {prettyPath(page.path)}</span><b>{compact.format(page.views)}</b></div><i><span style={{width:`${Math.max(3,Number(page.views)/Math.max(1,...data.pages.map(item=>item.views))*100)}%`}}/></i><small>{compact.format(page.visitors)} unique visitors</small></div>)}</div> : <div className="pc-visitors-empty">{loading ? 'Loading page metrics…' : 'No page data to display yet.'}</div>}</article>
      <article className="pc-card"><header className="pc-card-head"><h3><Users size={18}/>Sources & devices</h3></header><div className="pc-visitors-two-breakdowns">
        <div><h4>Referrers</h4>{data.sources.length ? data.sources.slice(0,5).map(row=><div className="pc-visitors-mini-row" key={row.label}><span>{row.label||'Direct'}</span><b>{compact.format(row.visits)}</b><i><span style={{width:`${Math.max(3,Number(row.visits)/maxSource*100)}%`}}/></i></div>) : <small className="pc-visitors-muted">{loading?'Loading…':'No referrers recorded.'}</small>}</div>
        <div><h4>Devices</h4>{data.devices.length ? data.devices.slice(0,5).map(row=><div className="pc-visitors-mini-row" key={row.label}><span>{row.label||'Unknown'}</span><b>{compact.format(row.visits)}</b><i><span style={{width:`${Math.max(3,Number(row.visits)/maxDevice*100)}%`}}/></i></div>) : <small className="pc-visitors-muted">{loading?'Loading…':'No device data recorded.'}</small>}</div>
      </div></article>
    </div>
  </section>;
}
