import React, { useMemo, useState } from 'react';
import {
  Users, UserPlus, UserCheck, UserX, Handshake, ShieldCheck, Activity,
  TrendingUp, Search, CheckCircle2, XCircle, Clock3, BriefcaseBusiness,
  Mail, Phone, MapPin, RefreshCcw, Plus, X, KeyRound, Shield, Eye, Check
} from 'lucide-react';
import { useCrm } from '../lib/crm';

type Tab = 'employees' | 'partners' | 'pending-partners';

export const TeamManagementView: React.FC = () => {
  const crm = useCrm();
  const [tab, setTab] = useState<Tab>('employees');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    login: '',
    password: '',
    jobProfile: 'SALES_EXECUTIVE',
    managerId: ''
  });
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    category: 'Referral / Business Partner'
  });

  const staff = useMemo(
    () => crm.users.filter(u => ['ADMIN','MANAGER','EMPLOYEE','FINANCE'].includes(u.role)),
    [crm.users]
  );

  const partnerRecords = useMemo(
    () => crm.records.filter(r => r.kind === 'partner'),
    [crm.records]
  );

  const q = search.trim().toLowerCase();

  const visibleStaff = staff.filter(u =>
    !q || [u.name,u.login,u.role,u.profile?.department,u.profile?.role_title]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
  );

  const visiblePartners = partnerRecords.filter(r => {
    const d=r.data||{};
    if(tab==='pending-partners' && String(d.status||'Pending').toLowerCase()!=='pending') return false;
    if(tab==='partners' && String(d.status||'Pending').toLowerCase()==='pending') return false;
    return !q || [d.name,d.contactPerson,d.email,d.phone,d.category,d.location]
      .filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
  });

  const employeeMetrics = (userId:string) => {
    const assigned = crm.leads.filter(l => l.assigned_to===userId);
    const converted = assigned.filter(l => l.stage==='CONVERTED').length;
    const tasks = crm.workflows.filter(w => w.assignee_id===userId && w.kind==='task');
    const completedTasks = tasks.filter(w => w.status==='COMPLETED').length;
    const visits = crm.workflows.filter(w => w.assignee_id===userId && w.kind==='visit');
    const completedVisits = visits.filter(w => w.status==='COMPLETED').length;
    const scoreParts:number[]=[];
    if(assigned.length) scoreParts.push((converted/assigned.length)*100);
    if(tasks.length) scoreParts.push((completedTasks/tasks.length)*100);
    if(visits.length) scoreParts.push((completedVisits/visits.length)*100);
    const score=scoreParts.length ? Math.round(scoreParts.reduce((a,b)=>a+b,0)/scoreParts.length) : 0;
    return {assigned:assigned.length,converted,completedTasks,totalTasks:tasks.length,completedVisits,totalVisits:visits.length,score};
  };

  const updateStaff = async (u:any, active:boolean) => {
    setBusyId(u.id); setMessage('');
    try {
      await crm.command('user_update',{id:u.id,active});
      setMessage(active ? `${u.name} has been re-activated.` : `${u.name} has been terminated/deactivated.`);
    } catch(e:any) {
      setMessage(e.message || 'Unable to update employee status.');
    } finally { setBusyId(''); }
  };

  const updatePartner = async (record:any,status:string) => {
    setBusyId(record.id); setMessage('');
    try {
      await crm.command('record_save',{
        id:record.id,
        version:record.version,
        kind:'partner',
        data:{...(record.data||{}),status}
      });
      setMessage(status==='Active' ? 'Partner approved and portal access activated.' : 'Partner application rejected/deactivated.');
    } catch(e:any) {
      setMessage(e.message || 'Unable to update partner.');
    } finally { setBusyId(''); }
  };

  const accessPresets:Record<string,{label:string;role:string;description:string;modules:string[]}> = {
    SALES_EXECUTIVE:{
      label:'Sales Executive',
      role:'EMPLOYEE',
      description:'Own assigned leads only. Can work on lead follow-ups, customer communication and sales tasks.',
      modules:['Assigned Leads','Follow-ups','Customers','Tasks']
    },
    TELECALLER:{
      label:'Telecaller',
      role:'EMPLOYEE',
      description:'Own assigned leads only. Focused access for calling, follow-ups and lead notes.',
      modules:['Assigned Leads','Follow-ups','Call Notes']
    },
    MANAGER:{
      label:'Manager',
      role:'MANAGER',
      description:'Can manage only leads belonging to their team and unassigned leads in their management scope.',
      modules:['Team Leads','Assignments','Follow-ups','Site Visits','Tasks','Reports']
    },
    FIELD_EXECUTIVE:{
      label:'Field Executive',
      role:'EMPLOYEE',
      description:'Own assigned leads only with site visit and task execution workflow.',
      modules:['Assigned Leads','Site Visits','Tasks','Follow-ups']
    }
  };

  const createEmployee = async (e:React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const preset=accessPresets[employeeForm.jobProfile];
    if(!employeeForm.name.trim() || !employeeForm.login.trim() || employeeForm.password.length<12) {
      setMessage('Name, Login ID and a temporary password of at least 12 characters are required.');
      return;
    }
    setBusyId('new-employee');
    try {
      await crm.command('user_create',{
        name:employeeForm.name.trim(),
        login:employeeForm.login.trim(),
        password:employeeForm.password,
        role:preset.role,
        manager_id:preset.role==='EMPLOYEE' ? employeeForm.managerId || null : null
      });
      setMessage(`${preset.label} account created successfully. Data access is restricted by role and assignment.`);
      setShowEmployeeModal(false);
      setEmployeeForm({name:'',login:'',password:'',jobProfile:'SALES_EXECUTIVE',managerId:''});
    } catch(e:any) {
      setMessage(e.message || 'Unable to add employee.');
    } finally { setBusyId(''); }
  };

  const createPartner = async (e:React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await crm.command('record_save',{
        kind:'partner',
        data:{
          ...partnerForm,
          status:'Active',
          commissionRate:0,
          rating:0,
          source:'ADMIN_CREATED'
        }
      });
      setMessage('Partner added successfully.');
      setShowPartnerModal(false);
      setPartnerForm({
        name:'',
        contactPerson:'',
        email:'',
        phone:'',
        location:'',
        category:'Referral / Business Partner'
      });
      setTab('partners');
    } catch(e:any) {
      setMessage(e.message || 'Unable to add partner.');
    }
  };

  const pendingCount=partnerRecords.filter(r=>String(r.data?.status||'Pending').toLowerCase()==='pending').length;
  const activePartnerCount=partnerRecords.filter(r=>['active','approved'].includes(String(r.data?.status||'').toLowerCase())).length;

  return (
    <div className="p-4 lg:p-6 max-w-[1450px] mx-auto space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0b3824] text-white grid place-items-center"><Users className="w-5 h-5"/></div>
            <div>
              <h1 className="text-2xl font-black text-slate-950">Team Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">Employees, referral partners, supplier partners and approval workflow in one place.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmployeeModal(true)}
            className="h-10 px-4 rounded-xl bg-[#0b3824] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-[#123e27]"
          >
            <UserPlus className="w-4 h-4"/> Add Employee
          </button>
          <button
            type="button"
            onClick={() => setShowPartnerModal(true)}
            className="h-10 px-4 rounded-xl bg-amber-400 text-[#0b3824] text-xs font-black flex items-center gap-2 shadow-sm hover:bg-amber-300"
          >
            <Plus className="w-4 h-4"/> Add Partner
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-[390px] max-w-full">
          <Stat label="Staff" value={staff.length} icon={<Users/>}/>
          <Stat label="Active Partners" value={activePartnerCount} icon={<Handshake/>}/>
          <Stat label="Pending Approval" value={pendingCount} icon={<Clock3/>}/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <TabButton active={tab==='employees'} onClick={()=>setTab('employees')} icon={<Users/>}>Employees</TabButton>
            <TabButton active={tab==='partners'} onClick={()=>setTab('partners')} icon={<Handshake/>}>Active / Managed Partners</TabButton>
            <TabButton active={tab==='pending-partners'} onClick={()=>setTab('pending-partners')} icon={<Clock3/>}>Partner Applications {pendingCount ? `(${pendingCount})` : ''}</TabButton>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search team or partner..." className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white"/>
          </div>
        </div>

        {message && <div className="mx-4 mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800">{message}</div>}

        {tab==='employees' ? (
          <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visibleStaff.map(u=>{
              const m=employeeMetrics(u.id);
              return (
                <div key={u.id} className="rounded-2xl border border-slate-200 p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#0b3824] text-white grid place-items-center font-black">{u.name?.slice(0,1)?.toUpperCase()}</div>
                      <div>
                        <div className="font-black text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.profile?.role_title || u.role} · {u.profile?.department || 'AKBS'}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{u.login}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${u.active?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800'}`}>{u.active?'ACTIVE':'TERMINATED'}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <Metric label="Assigned Leads" value={m.assigned}/>
                    <Metric label="Converted" value={m.converted}/>
                    <Metric label="Tasks Done" value={`${m.completedTasks}/${m.totalTasks}`}/>
                    <Metric label="Visits Done" value={`${m.completedVisits}/${m.totalVisits}`}/>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-700"/>Performance Score</span>
                      <span className="font-black text-emerald-800">{m.score}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2"><div className="h-full bg-emerald-600 transition-all" style={{width:`${m.score}%`}}/></div>
                    <p className="text-[9px] text-slate-400 mt-1.5">Calculated from lead conversion, completed tasks and completed site visits.</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-end">
                    {u.id!==crm.user.id && (
                      <button disabled={busyId===u.id} onClick={()=>updateStaff(u,!u.active)} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${u.active?'bg-rose-50 text-rose-700 border border-rose-200':'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {u.active?<UserX className="w-3.5 h-3.5"/>:<UserCheck className="w-3.5 h-3.5"/>}
                        {u.active?'Terminate Access':'Re-activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visiblePartners.map(r=>{
              const d=r.data||{};
              const pending=String(d.status||'Pending').toLowerCase()==='pending';
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 grid place-items-center"><Handshake className="w-5 h-5"/></div>
                      <div>
                        <div className="font-black text-slate-900">{d.name || d.contactPerson || 'Partner Applicant'}</div>
                        <div className="text-[11px] text-purple-700 font-semibold">{d.category || 'Partner'}</div>
                        <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                          {d.contactPerson && <div className="flex items-center gap-1.5"><BriefcaseBusiness className="w-3 h-3"/>{d.contactPerson}</div>}
                          {d.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3"/>{d.email}</div>}
                          {d.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3"/>{d.phone}</div>}
                          {d.location && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3"/>{d.location}</div>}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${pending?'bg-amber-100 text-amber-800':String(d.status).toLowerCase()==='active'?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800'}`}>{d.status || 'Pending'}</span>
                  </div>

                  {(d.profession||d.experience||d.message) && (
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-600 space-y-1">
                      {d.profession && <div><b>Business:</b> {d.profession}</div>}
                      {d.experience && <div><b>Experience:</b> {d.experience}</div>}
                      {d.message && <div><b>Note:</b> {d.message}</div>}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 justify-end">
                    {pending ? (
                      <>
                        <button disabled={busyId===r.id} onClick={()=>updatePartner(r,'Rejected')} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5"/>Reject</button>
                        <button disabled={busyId===r.id} onClick={()=>updatePartner(r,'Active')} className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/>Approve & Activate</button>
                      </>
                    ) : (
                      <button disabled={busyId===r.id} onClick={()=>updatePartner(r,String(d.status).toLowerCase()==='active'?'Suspended':'Active')} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5"><RefreshCcw className="w-3.5 h-3.5"/>{String(d.status).toLowerCase()==='active'?'Suspend Partner':'Activate Partner'}</button>
                    )}
                  </div>
                </div>
              );
            })}
            {!visiblePartners.length && <div className="xl:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-sm text-slate-500">No partner records found for this view.</div>}
          </div>
        )}
      </div>

      {showEmployeeModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/55 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Team Management</div>
                <h3 className="text-lg font-black text-slate-900">Add Employee & Set Access</h3>
              </div>
              <button onClick={()=>setShowEmployeeModal(false)} className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-600"><X className="w-4 h-4"/></button>
            </div>

            <form onSubmit={createEmployee} className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-[11px] font-bold text-slate-600">Employee Name *
                  <input required value={employeeForm.name} onChange={e=>setEmployeeForm({...employeeForm,name:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Login ID / Email *
                  <input required type="text" value={employeeForm.login} onChange={e=>setEmployeeForm({...employeeForm,login:e.target.value})} placeholder="employee@akbspoultry.com" className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Temporary Password *
                  <input required minLength={12} maxLength={72} type="text" value={employeeForm.password} onChange={e=>setEmployeeForm({...employeeForm,password:e.target.value})} placeholder="Minimum 12 characters" className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Employee Type / Access Profile *
                  <select value={employeeForm.jobProfile} onChange={e=>setEmployeeForm({...employeeForm,jobProfile:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500">
                    <option value="SALES_EXECUTIVE">Sales Executive</option>
                    <option value="TELECALLER">Telecaller</option>
                    <option value="FIELD_EXECUTIVE">Field Executive</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </label>
              </div>

              {accessPresets[employeeForm.jobProfile].role==='EMPLOYEE' && (
                <label className="block text-[11px] font-bold text-slate-600">Reporting Manager
                  <select value={employeeForm.managerId} onChange={e=>setEmployeeForm({...employeeForm,managerId:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500">
                    <option value="">No manager assigned yet</option>
                    {staff.filter(u=>u.role==='MANAGER' && u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
              )}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
                  <Shield className="w-4 h-4"/> {accessPresets[employeeForm.jobProfile].label} Access
                </div>
                <p className="mt-1.5 text-[11px] text-emerald-800/80 leading-relaxed">{accessPresets[employeeForm.jobProfile].description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {accessPresets[employeeForm.jobProfile].modules.map(m=><span key={m} className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><Check className="w-3 h-3"/>{m}</span>)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-500 flex gap-2">
                <Eye className="w-4 h-4 text-slate-500 shrink-0"/>
                <div>
                  <b className="text-slate-700">Data isolation:</b> Employees can see only leads assigned to their own user account. Managers see only their managed team scope. One employee cannot open another employee's assigned lead data.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={()=>setShowEmployeeModal(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancel</button>
                <button disabled={busyId==='new-employee'} type="submit" className="h-10 px-5 rounded-xl bg-[#0b3824] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60">
                  <KeyRound className="w-4 h-4"/>{busyId==='new-employee'?'Creating…':'Create Employee Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPartnerModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/55 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Team Management</div>
                <h3 className="text-lg font-black text-slate-900">Add Partner</h3>
              </div>
              <button onClick={()=>setShowPartnerModal(false)} className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-600"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={createPartner} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-[11px] font-bold text-slate-600">Partner / Firm Name *
                  <input required value={partnerForm.name} onChange={e=>setPartnerForm({...partnerForm,name:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Contact Person
                  <input value={partnerForm.contactPerson} onChange={e=>setPartnerForm({...partnerForm,contactPerson:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Email
                  <input type="email" value={partnerForm.email} onChange={e=>setPartnerForm({...partnerForm,email:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Phone
                  <input value={partnerForm.phone} onChange={e=>setPartnerForm({...partnerForm,phone:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Location
                  <input value={partnerForm.location} onChange={e=>setPartnerForm({...partnerForm,location:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Partner Type
                  <select value={partnerForm.category} onChange={e=>setPartnerForm({...partnerForm,category:e.target.value})} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-emerald-500">
                    <option>Referral / Business Partner</option>
                    <option>Feed Supplier</option>
                    <option>Equipment & Automation</option>
                    <option>Hatchery / DOC</option>
                    <option>Veterinary & Pharma</option>
                    <option>Bank / NBFC Partner</option>
                    <option>Processing & Off-taker</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowPartnerModal(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" className="h-10 px-5 rounded-xl bg-[#0b3824] text-white text-xs font-bold flex items-center gap-2"><Handshake className="w-4 h-4"/>Add Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat=({label,value,icon}:{label:string;value:any;icon:React.ReactNode})=><div className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm"><div className="flex items-center gap-2 text-slate-500 [&>svg]:w-4 [&>svg]:h-4">{icon}<span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div><div className="mt-1 text-xl font-black text-slate-900">{value}</div></div>;
const Metric=({label,value}:{label:string;value:any})=><div className="rounded-xl bg-slate-50 border border-slate-100 px-2 py-2 text-center"><div className="text-[9px] text-slate-400">{label}</div><div className="text-sm font-black text-slate-800 mt-0.5">{value}</div></div>;
const TabButton=({active,onClick,icon,children}:{active:boolean;onClick:()=>void;icon:React.ReactNode;children:React.ReactNode})=><button onClick={onClick} className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors [&>svg]:w-4 [&>svg]:h-4 ${active?'bg-[#0b3824] text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{icon}{children}</button>;
