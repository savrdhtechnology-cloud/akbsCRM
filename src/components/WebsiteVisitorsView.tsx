import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Globe2, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { useCrm } from '../lib/crm';

type DailyPoint = { date: string; views: number };
type PageRow = { path: string; views: number; visitors: number };
type BreakdownRow = { label: string; visits: number };
type RecentVisit = { at: string; path: string; source: string; device: string };
type Analytics = {
  totalViews: number;
  uniqueVisitors: number;
  activeNow: number;
  totalPages: number;
  daily: DailyPoint[];
  pages: PageRow[];
  sources: BreakdownRow[];
  devices: BreakdownRow[];
  recent: RecentVisit[];
};

const empty: Analytics = { totalViews: 0, uniqueVisitors: 0, activeNow: 0, totalPages: 0, daily: [], pages: [], sources: [], devices: [], recent: [] };
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const dateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(+date) ? '—' : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const prettyPath = (value: string) => value === '/' ? 'Home' : value;
const deviceIcon = (device: string) => device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;

export function WebsiteVisitorsView() {
  const { websiteAnalytics } = useCrm();
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Analytics>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await websiteAnalytics('summary', { days: range });
      setData({
        totalViews: Number(result?.totalViews || 0),
        uniqueVisitors: Number(result?.uniqueVisitors || 0),
        activeNow: Number(result?.activeNow || 0),
        totalPages: Number(result?.totalPages || 0),
        daily: Array.isArray(result?.daily) ? result.daily : [],
        pages: Array.isArray(result?.pages) ? result.pages : [],
        sources: Array.isArray(result?.sources) ? result.sources : [],
        devices: Array.isArray(result?.devices) ? result.devices : [],
        recent: Array.isArray(result?.recent) ? result.recent : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Visitor analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [websiteAnalytics, range]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const maxViews = Math.max(1, ...data.daily.map(point => Number(point.views) || 0));
  const maxSource = Math.max(1, ...data.sources.map(row => Number(row.visits) || 0));
  const maxDevice = Math.max(1, ...data.devices.map(row => Number(row.visits) || 0));
  const IconActive = Activity;

  return <section className="pc-page pc-visitors" aria-labelledby="website-visitors-title">
    <div className="pc-visitors-toolbar">
      <div>
        <h2 id="website-visitors-title">Website traffic</h2>
        <p>Real visits recorded on akbspoultry.com. Visitor IDs are temporary and anonymous.</p>
      </div>
      <div className="pc-visitors-controls">
        <label className="pc-select pc-visitors-range">Date range
          <select value={range} onChange={event => setRange(Number(event.target.value))} aria-label="Website visitor date range">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <button className="pc-btn" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'pc-visitors-spin' : ''}/>Refresh</button>
      </div>
    </div>

    {error && <div className="pc-visitors-error" role="alert">
      <strong>Analytics connection unavailable</strong>
      <span>{error}</span>
      <small>Check the website analytics database migration and reload.</small>
    </div>}

    <div className="pc-kpis compact pc-visitors-kpis" aria-live="polite">
      <article className="pc-kpi" style={{'--tone':'#22d3ee'} as React.CSSProperties}>
        <span className="pc-kpi-icon"><Eye size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Page views</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.totalViews)}</strong></div>
      </article>
      <article className="pc-kpi" style={{'--tone':'#8b5cf6'} as React.CSSProperties}>
        <span className="pc-kpi-icon"><Users size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Unique visitors</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.uniqueVisitors)}</strong></div>
      </article>
      <article className="pc-kpi" style={{'--tone':'#34d399'} as React.CSSProperties}>
        <span className="pc-kpi-icon"><IconActive size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Active now</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.activeNow)}</strong></div>
      </article>
      <article className="pc-kpi" style={{'--tone':'#a78bfa'} as React.CSSProperties}>
        <span className="pc-kpi-icon"><Globe2 size={22}/></span><div className="pc-kpi-body"><span className="pc-kpi-label">Pages visited</span><strong className="pc-kpi-value">{loading ? '—' : compact.format(data.totalPages)}</strong></div>
      </article>
    </div>

    <div className="pc-grid-2 pc-visitors-main-grid">
      <article className="pc-card">
        <header className="pc-card-head"><h3><Activity size={18}/>Traffic trend <small>Last {range} days</small></h3></header>
        {data.daily.length ? <div className="pc-visitors-chart" role="img" aria-label={data.daily.map(point => `${point.date}: ${point.views} visits`).join('; ')}>
          {data.daily.map(point => <div className="pc-visitors-chart-col" key={point.date} title={`${point.date}: ${point.views} page views`}>
            <span style={{height:`${Math.max(3,Number(point.views)/maxViews*100)}%`}}/>
            <small>{new Date(point.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</small>
          </div>)}
        </div> : <div className="pc-visitors-empty">{loading ? 'Loading real visitor data…' : 'No visitor events recorded for this period.'}</div>}
      </article>

      <article className="pc-card pc-visitors-live">
        <header className="pc-card-head"><h3><Activity size={18}/>Live traffic <small>Recent visits</small></h3><span className="pc-visitors-live-dot" aria-label="Refreshes every 30 seconds"/></header>
        {data.recent.length ? <ul className="pc-visitors-live-list">{data.recent.slice(0,8).map((visit,index) => {
          const Device = deviceIcon(visit.device);
          return <li key={visit.at+visit.path+index}><span className="pc-visitors-device"><Device size={16}/></span><span className="pc-visitors-live-copy"><b>{prettyPath(visit.path)}</b><small>{visit.source || 'Direct'} · {visit.device || 'unknown'}</small></span><time>{dateTime(visit.at)}</time></li>;
        })}</ul> : <div className="pc-visitors-empty">{loading ? 'Loading recent visits…' : 'Your website visits will appear here when analytics is connected.'}</div>}
      </article>
    </div>

    <div className="pc-grid-2 pc-visitors-breakdowns">
      <article className="pc-card">
        <header className="pc-card-head"><h3><Globe2 size={18}/>Top pages</h3></header>
        {data.pages.length ? <div className="pc-visitors-rank-list">{data.pages.slice(0,8).map((page,index) => <div className="pc-visitors-rank" key={page.path}>
          <div><span>{index+1}. {prettyPath(page.path)}</span><b>{compact.format(page.views)}</b></div>
          <i><span style={{width:`${Math.max(3,Number(page.views)/Math.max(1,...data.pages.map(item=>item.views))*100)}%`}}/></i>
          <small>{compact.format(page.visitors)} unique visitors</small>
        </div>)}</div> : <div className="pc-visitors-empty">{loading ? 'Loading page metrics…' : 'No page data to display yet.'}</div>}
      </article>

      <article className="pc-card">
        <header className="pc-card-head"><h3><Users size={18}/>Sources & devices</h3></header>
        <div className="pc-visitors-two-breakdowns">
          <div><h4>Referrers</h4>{data.sources.length ? data.sources.slice(0,5).map(row=><div className="pc-visitors-mini-row" key={row.label}><span>{row.label || 'Direct'}</span><b>{compact.format(row.visits)}</b><i><span style={{width:`${Math.max(3,Number(row.visits)/maxSource*100)}%`}}/></i></div>) : <small className="pc-visitors-muted">{loading?'Loading…':'No referrers recorded.'}</small>}</div>
          <div><h4>Devices</h4>{data.devices.length ? data.devices.slice(0,5).map(row=><div className="pc-visitors-mini-row" key={row.label}><span>{row.label || 'Unknown'}</span><b>{compact.format(row.visits)}</b><i><span style={{width:`${Math.max(3,Number(row.visits)/maxDevice*100)}%`}}/></i></div>) : <small className="pc-visitors-muted">{loading?'Loading…':'No device data recorded.'}</small>}</div>
        </div>
      </article>
    </div>
  </section>;
}
