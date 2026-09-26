import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Plus,
  Phone,
  Mail,
  RefreshCw,
  Download,
  X,
  ArrowUpRight,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  Target,
  Building2,
} from "lucide-react";
import { useCrm, Lead, Workflow, Template } from "../lib/crm";
import { AkbsLogo } from "./AkbsLogo";
import { SoftQuotationModal } from "./SoftQuotationModal";
const stages: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  SITE_VISIT: "Site Visit",
  DPR: "DPR",
  PROPOSAL: "Proposal Sent",
  LOAN_PROCESSING: "Loan Processing",
  CONVERTED: "Converted",
  LOST: "Lost",
};
const money = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v || 0);
const date = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not scheduled";
const readable = (v: string) =>
  v
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="crm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="crm-badge">{children}</span>;
}
function exportCsv(rows: Lead[]) {
  const cols = [
    "reference",
    "name",
    "phone",
    "email",
    "location",
    "source",
    "stage",
    "assigned_to",
    "capacity",
    "project_cost",
  ];
  const safe = (v: any) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const blob = new Blob(
    [
      "\ufeff" +
        [
          cols.join(","),
          ...rows.map((r) => cols.map((k) => safe((r as any)[k])).join(",")),
        ].join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  downloadBlob(blob, "akbs-leads.csv");
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CrmWorkspace() {
  const crm = useCrm();
  const admin = crm.user.role === "ADMIN";
  const manager = admin || crm.user.role === "MANAGER";
  const finance = admin || crm.user.role === "FINANCE";
  const canEdit = crm.user.role !== "FINANCE";
  const [section, setSection] = useState("leads");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [state, setState] = useState("");
  const [scope, setScope] = useState("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState("overview");
  const [dialog, setDialog] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [quote, setQuote] = useState(false);
  const [nav, setNav] = useState(false);
  const owner = (id: string | null) =>
    crm.users.find((u) => u.id === id)?.name ||
    (id ? "Assigned employee" : "Unassigned");
  const filtered = useMemo(
    () =>
      crm.leads.filter(
        (l) =>
          (scope !== "my" || l.assigned_to === crm.user.id) &&
          (scope !== "unassigned" || !l.assigned_to) &&
          (!stage || stage === l.stage) &&
          (!source || source === l.source) &&
          (!state || state === (l.details?.state || "")) &&
          [l.name, l.phone, l.email, l.reference, l.location]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [crm.leads, scope, stage, source, state, search, crm.user.id],
  );
  useEffect(() => setPage(0), [search, scope, stage, source, state]);
  useEffect(() => {
    setPage((p) =>
      Math.min(p, Math.max(0, Math.ceil(filtered.length / 10) - 1)),
    );
  }, [filtered.length]);
  const visibleLeads = section === "leads" ? filtered : crm.leads;
  const lead = visibleLeads.find((l) => l.id === selected) || visibleLeads[0];
  const workflows = crm.workflows.filter((w) => w.lead_id === lead?.id);
  const activities = crm.activities.filter((a) => a.lead_id === lead?.id);
  const docs = crm.documents.filter((d) => d.lead_id === lead?.id);
  const act = async (
    fn: () => Promise<any>,
    message = "Saved successfully",
  ) => {
    if (busy) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      return true;
    } catch (e: any) {
      setFailure(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const open = (kind: string, data: any = {}) => {
    setFailure("");
    setDialog({ kind, ...data });
  };
  const changeLead = (data: Record<string, any>) =>
    crm.command("lead_update", {
      lead_id: lead.id,
      version: lead.version,
      ...data,
    });
  const download = async (id: string) => {
    const d = await crm.read("document_download", { id });
    const bytes = Uint8Array.from(atob(d.content), (c) => c.charCodeAt(0));
    downloadBlob(new Blob([bytes], { type: d.mime }), d.name);
  };
  const upload = async (file: File) => {
    if (!lead) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
      file.size > 2097152 ||
      file.size === 0
    )
      throw new Error("Choose a PDF, JPG or PNG file up to 2 MB.");
    const content = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = () => reject(new Error("Could not read file"));
      r.readAsDataURL(file);
    });
    await crm.command("document_upload", {
      lead_id: lead.id,
      name: file.name,
      mime: file.type,
      size: file.size,
      content,
      category: "Project document",
      shared: false,
    });
  };
  const navigation = [
    ["dashboard", "Overview", LayoutDashboard],
    ["leads", "Leads", Users],
    ["followup", "Follow-ups", CalendarDays],
    ["task", "Tasks", CheckSquare],
    ["visit", "Site visits", Target],
    ["proposal", "DPR & proposals", FileText],
    ...(finance ? [["financing", "Financing", Building2]] : []),
    ["customers", "Customers", UserCheck],
    ["documents", "Documents", FolderOpen],
    ["templates", "Templates", MessageSquare],
    ...(admin ? [["team", "Team & access", Users]] : []),
    ["settings", "My account", Settings],
  ];
  function workflowList(items: Workflow[]) {
    return (
      <div className="crm-stack">
        {!items.length && (
          <div className="crm-empty">No records yet. Add one from a lead.</div>
        )}
        {items.map((w) => (
          <article className="crm-record" key={w.id}>
            <div>
              <span className="crm-eyebrow">
                {readable(w.kind)} ·{" "}
                {crm.leads.find((l) => l.id === w.lead_id)?.name}
              </span>
              <h3>{w.title}</h3>
              <p>
                {date(w.due_at)} · {owner(w.assignee_id)}
              </p>
              {w.notes && <p className="preserve">{w.notes}</p>}
              {w.amount > 0 && <strong>{money(w.amount)}</strong>}
            </div>
            <div>
              <Badge>{readable(w.status)}</Badge>
              <button
                disabled={busy}
                onClick={() => {
                  setSelected(w.lead_id);
                  open("workflow", { workflow: w, workflowKind: w.kind });
                }}
              >
                Update
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  }
  const tabs = [
    "overview",
    "project",
    "financial",
    "documents",
    "activities",
    "followups",
  ];
  return (
    <div className="crm-app">
      <aside className={"crm-sidebar " + (nav ? "open" : "")}>
        <div className="crm-brand">
          <AkbsLogo size="md" />
        </div>
        <span className="crm-nav-label">WORKSPACE</span>
        <nav>
          {navigation.map(([id, label, Icon]: any) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => {
                setSection(id);
                setNav(false);
              }}
            >
              <Icon size={18} />
              {label}
              {id === "leads" && <span>{crm.leads.length}</span>}
            </button>
          ))}
        </nav>
        <div className="crm-sidebar-foot">
          <span className="crm-avatar">{crm.user.name.charAt(0)}</span>
          <div>
            <strong>{crm.user.name}</strong>
            <small>{readable(crm.user.role)}</small>
          </div>
          <button title="Sign out" aria-label="Sign out" onClick={crm.logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="crm-main">
        <header className="crm-topbar">
          <button
            className="crm-mobile-toggle"
            aria-label="Toggle navigation"
            onClick={() => setNav(!nav)}
          >
            <Menu />
          </button>
          <div>
            <span className="crm-eyebrow">AKBS POULTRY FARMING</span>
            <h1>{navigation.find((n) => n[0] === section)?.[1] as string}</h1>
          </div>
          <div className="crm-top-actions">
            <span className="crm-live">Live workspace</span>
            <button
              disabled={busy}
              onClick={() => void act(crm.refresh, "Workspace refreshed")}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={17} />
            </button>
            {canEdit && (
              <button className="primary" onClick={() => open("lead")}>
                <Plus size={17} />
                Add lead
              </button>
            )}
          </div>
        </header>
        <main className="crm-content">
          {(failure || crm.error) && (
            <div className="crm-error" role="alert">
              {failure || crm.error}
            </div>
          )}
          {notice && (
            <div className="crm-success" role="status">
              {notice}
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {(section === "dashboard" || section === "leads") && (
            <div className="crm-metrics">
              {[
                [
                  "Total leads",
                  crm.leads.length,
                  "All enquiries in your workspace",
                ],
                [
                  "Open pipeline",
                  crm.leads.filter(
                    (l) => !["CONVERTED", "LOST"].includes(l.stage),
                  ).length,
                  "From enquiry to proposal",
                ],
                [
                  "Converted",
                  crm.leads.filter((l) => l.stage === "CONVERTED").length,
                  "Approved & accepted projects",
                ],
                [
                  "Unassigned",
                  crm.leads.filter((l) => !l.assigned_to).length,
                  "Ready for an owner",
                ],
              ].map(([label, value, sub]) => (
                <div className="crm-metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{sub}</small>
                </div>
              ))}
            </div>
          )}
          {section === "dashboard" && (
            <div className="crm-grid-two">
              <section className="crm-panel">
                <h2>Sales pipeline</h2>
                {Object.entries(stages).map(([key, label]) => {
                  const n = crm.leads.filter((l) => l.stage === key).length;
                  return (
                    <button
                      className="crm-pipeline"
                      key={key}
                      onClick={() => {
                        setStage(key);
                        setSection("leads");
                      }}
                    >
                      <span>{label}</span>
                      <div>
                        <i
                          style={{
                            width: `${crm.leads.length ? (n / crm.leads.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <b>{n}</b>
                    </button>
                  );
                })}
              </section>
              <section className="crm-panel">
                <h2>Upcoming work</h2>
                {workflowList(
                  crm.workflows
                    .filter(
                      (w) =>
                        w.due_at &&
                        !["COMPLETED", "CANCELLED"].includes(w.status),
                    )
                    .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
                    .slice(0, 5),
                )}
              </section>
            </div>
          )}
          {section === "leads" && (
            <>
              <div className="crm-toolbar">
                <div className="crm-search">
                  <Search size={17} />
                  <input
                    aria-label="Search leads"
                    placeholder="Search name, phone or application…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="">All stages</option>
                  {Object.entries(stages).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">All states</option>
                  {[
                    ...new Set(
                      crm.leads.map((l) => String(l.details?.state || "")),
                    ),
                  ]
                    .filter(Boolean)
                    .sort()
                    .map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
                <select
                  aria-label="Filter source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="">All sources</option>
                  {[...new Set(crm.leads.map((l) => l.source))].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button onClick={() => exportCsv(filtered)}>
                  <Download size={16} />
                  Export
                </button>
              </div>
              <div className="crm-scope">
                {[
                  ["all", "All leads"],
                  ["my", "My leads"],
                  ["unassigned", "Unassigned"],
                ].map(([k, v]) => (
                  <button
                    className={scope === k ? "active" : ""}
                    key={k}
                    onClick={() => setScope(k)}
                  >
                    {v}{" "}
                    <span>
                      {k === "all"
                        ? crm.leads.length
                        : k === "my"
                          ? crm.leads.filter(
                              (l) => l.assigned_to === crm.user.id,
                            ).length
                          : crm.leads.filter((l) => !l.assigned_to).length}
                    </span>
                  </button>
                ))}
                {admin && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => crm.command("auto_assign"),
                        "Unassigned open leads allocated to active employees.",
                      )
                    }
                  >
                    <UserCheck size={16} />
                    Auto-assign
                  </button>
                )}
              </div>
              <div className="crm-lead-grid">
                <section className="crm-list">
                  <div className="crm-list-heading">
                    <strong>{filtered.length} leads</strong>
                    <small>Newest first</small>
                  </div>
                  {filtered.slice(page * 10, page * 10 + 10).map((l) => (
                    <button
                      className={
                        "crm-lead-card " + (l.id === lead?.id ? "selected" : "")
                      }
                      key={l.id}
                      onClick={() => {
                        setSelected(l.id);
                        setDetail("overview");
                      }}
                    >
                      <div>
                        <span className="crm-avatar">{l.name.charAt(0)}</span>
                        <div>
                          <strong>{l.name}</strong>
                          <small>{l.reference}</small>
                        </div>
                        <ArrowUpRight size={15} />
                      </div>
                      <p>{l.location || "Location pending"}</p>
                      <p>
                        {l.capacity.toLocaleString("en-IN")} birds ·{" "}
                        {l.project_type || "Project pending"}
                      </p>
                      <div>
                        <Badge>{stages[l.stage]}</Badge>
                        <small>{owner(l.assigned_to)}</small>
                      </div>
                    </button>
                  ))}
                  {!filtered.length && (
                    <div className="crm-empty">No matching leads.</div>
                  )}
                  <div className="crm-pagination">
                    <button
                      aria-label="Previous page"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      {page + 1} /{" "}
                      {Math.max(1, Math.ceil(filtered.length / 10))}
                    </span>
                    <button
                      aria-label="Next page"
                      disabled={(page + 1) * 10 >= filtered.length}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </section>
                {lead ? (
                  <>
                    <section className="crm-detail crm-panel">
                      <div className="crm-detail-heading">
                        <span className="crm-avatar large">
                          {lead.name.charAt(0)}
                        </span>
                        <div>
                          <span className="crm-eyebrow">{lead.reference}</span>
                          <h2>{lead.name}</h2>
                          <p>{lead.location || "Location pending"}</p>
                        </div>
                        {canEdit && (
                          <button onClick={() => open("lead", { lead })}>
                            Edit
                          </button>
                        )}
                      </div>
                      <div className="crm-contact">
                        <a href={"tel:" + lead.phone}>
                          <Phone size={14} />
                          {lead.phone}
                        </a>
                        {lead.email && (
                          <a href={"mailto:" + lead.email}>
                            <Mail size={14} />
                            {lead.email}
                          </a>
                        )}
                      </div>
                      <div className="crm-lead-summary">
                        <Badge>{stages[lead.stage]}</Badge>
                        <span>
                          {lead.capacity.toLocaleString("en-IN")} birds
                        </span>
                        <strong>{money(lead.project_cost)}</strong>
                      </div>
                      <div className="crm-detail-tabs">
                        {tabs.map((t) => (
                          <button
                            className={detail === t ? "active" : ""}
                            key={t}
                            onClick={() => setDetail(t)}
                          >
                            {readable(t)}
                          </button>
                        ))}
                      </div>
                      {detail === "overview" && (
                        <>
                          <div className="crm-info-grid">
                            {[
                              ["Source", lead.source],
                              ["Created", date(lead.created_at)],
                              ["Assigned to", owner(lead.assigned_to)],
                              ["Priority", readable(lead.priority)],
                              ["Approval", readable(lead.approval)],
                              ["Project", lead.project_type || "Not recorded"],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <small>{k}</small>
                                <strong>{v}</strong>
                              </div>
                            ))}
                          </div>
                          <h3>Customer requirement</h3>
                          <p className="preserve">
                            {lead.message || "No requirement recorded yet."}
                          </p>
                          <div className="crm-section-heading">
                            <h3>Notes & recent activity</h3>
                            <button onClick={() => open("note")}>
                              Add note
                            </button>
                          </div>
                          {activities.slice(0, 5).map((a) => (
                            <div className="crm-timeline" key={a.id}>
                              <b>{readable(a.action)}</b>
                              <p className="preserve">{a.note}</p>
                              <small>
                                {a.actor_name} · {date(a.created_at)}
                              </small>
                            </div>
                          ))}
                        </>
                      )}
                      {detail === "project" && (
                        <div className="crm-info-grid">
                          {[
                            ["Project type", lead.project_type],
                            ["Bird capacity", String(lead.capacity)],
                            ["State", lead.details?.state],
                            ["District", lead.details?.district],
                            ["Shed type", lead.details?.shedType],
                            ["Land area", lead.details?.landArea],
                            ["Land ownership", lead.details?.landOwnership],
                            ["Experience", lead.details?.experience],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <small>{k}</small>
                              <strong>{v || "Not recorded"}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      {detail === "financial" && (
                        <>
                          <div className="crm-info-grid">
                            <div>
                              <small>Estimated project cost</small>
                              <strong>{money(lead.project_cost)}</strong>
                            </div>
                            <div>
                              <small>Loan required</small>
                              <strong>
                                {lead.details?.loanRequired || "Not recorded"}
                              </strong>
                            </div>
                          </div>
                          {workflowList(
                            workflows.filter((w) => w.kind === "financing"),
                          )}
                          {finance && (
                            <button
                              onClick={() =>
                                open("workflow", { workflowKind: "financing" })
                              }
                            >
                              Create financing record
                            </button>
                          )}
                        </>
                      )}
                      {detail === "documents" && (
                        <>
                          <p>
                            Private project files · PDF, JPG or PNG · up to 2 MB
                            each
                          </p>
                          <label className="crm-upload">
                            Upload document
                            <input
                              aria-label="Upload document"
                              disabled={busy}
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f)
                                  void act(
                                    () => upload(f),
                                    "Document uploaded",
                                  );
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {docs.map((d) => (
                            <div className="crm-record" key={d.id}>
                              <div>
                                <h3>{d.name}</h3>
                                <p>
                                  {Math.ceil(d.size / 1024)} KB ·{" "}
                                  {date(d.created_at)}
                                </p>
                              </div>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    () => download(d.id),
                                    "Download ready",
                                  )
                                }
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          ))}
                          {!docs.length && (
                            <div className="crm-empty">
                              No documents uploaded yet.
                            </div>
                          )}
                        </>
                      )}
                      {detail === "activities" && (
                        <>
                          {activities.map((a) => (
                            <div className="crm-timeline" key={a.id}>
                              <b>{readable(a.action)}</b>
                              <p className="preserve">{a.note}</p>
                              <small>
                                {a.actor_name} · {date(a.created_at)}
                                {a.shared ? " · Shared" : ""}
                              </small>
                            </div>
                          ))}
                          {!activities.length && (
                            <div className="crm-empty">
                              No activity recorded.
                            </div>
                          )}
                        </>
                      )}
                      {detail === "followups" && (
                        <>
                          <button
                            onClick={() =>
                              open("workflow", { workflowKind: "followup" })
                            }
                          >
                            Schedule follow-up
                          </button>
                          {workflowList(
                            workflows.filter((w) =>
                              ["followup", "task", "visit"].includes(w.kind),
                            ),
                          )}
                        </>
                      )}
                    </section>
                    <aside className="crm-actions">
                      <section className="crm-panel">
                        <h3>Lead owner</h3>
                        <p>{owner(lead.assigned_to)}</p>
                        {manager && (
                          <button onClick={() => open("assign")}>
                            <UserCheck size={16} />
                            Change employee
                          </button>
                        )}
                        <small>
                          New leads are assigned automatically by active
                          workload.
                        </small>
                      </section>
                      <section className="crm-panel">
                        <h3>Quick actions</h3>
                        <div className="crm-action-stack">
                          {canEdit && (
                            <>
                              <button
                                className="primary"
                                onClick={() => setQuote(true)}
                              >
                                <FileText size={16} />
                                Soft quotation
                              </button>
                              <button
                                onClick={() =>
                                  open("workflow", { workflowKind: "proposal" })
                                }
                              >
                                Create DPR / proposal
                              </button>
                              <button
                                onClick={() => open("note", { call: true })}
                              >
                                <Phone size={16} />
                                Log a call
                              </button>
                              <button
                                onClick={() =>
                                  open("workflow", { workflowKind: "followup" })
                                }
                              >
                                <CalendarDays size={16} />
                                Schedule follow-up
                              </button>
                              <button
                                onClick={() =>
                                  open("workflow", { workflowKind: "visit" })
                                }
                              >
                                Schedule site visit
                              </button>
                              <button
                                onClick={() =>
                                  open("workflow", { workflowKind: "task" })
                                }
                              >
                                <CheckSquare size={16} />
                                Create task
                              </button>
                              <button onClick={() => open("stage")}>
                                Update stage
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              open("message", { channel: "whatsapp" })
                            }
                          >
                            <MessageSquare size={16} />
                            WhatsApp template
                          </button>
                          <button
                            onClick={() =>
                              open("message", { channel: "email" })
                            }
                          >
                            <Mail size={16} />
                            Email template
                          </button>
                          {manager && (
                            <>
                              <button onClick={() => open("approval")}>
                                Review approval
                              </button>
                              <button
                                disabled={busy || lead.stage === "CONVERTED"}
                                onClick={() =>
                                  void act(
                                    () => changeLead({ stage: "CONVERTED" }),
                                    "Lead converted to customer",
                                  )
                                }
                              >
                                Convert to customer
                              </button>
                            </>
                          )}
                        </div>
                      </section>
                      <section className="crm-panel">
                        <h3>Similar leads</h3>
                        {crm.leads
                          .filter(
                            (l) =>
                              l.id !== lead.id &&
                              ((lead.phone && l.phone === lead.phone) ||
                                (lead.email && l.email === lead.email) ||
                                (lead.project_type &&
                                  l.project_type === lead.project_type &&
                                  l.location === lead.location)),
                          )
                          .slice(0, 4)
                          .map((l) => (
                            <button
                              key={l.id}
                              onClick={() => setSelected(l.id)}
                            >
                              {l.name}
                            </button>
                          ))}
                        <small>
                          Matches phone, email, or project and location.
                        </small>
                      </section>
                    </aside>
                  </>
                ) : (
                  <section className="crm-panel crm-empty">
                    <h2>Your next project starts here</h2>
                    <p>
                      Add a lead to start tracking conversations and follow-ups.
                    </p>
                  </section>
                )}
              </div>
            </>
          )}
          {["followup", "task", "visit", "proposal", "financing"].includes(
            section,
          ) && (
            <section className="crm-panel">
              <div className="crm-section-heading">
                <h2>{readable(section)} records</h2>
                <button
                  onClick={() => {
                    setSection("leads");
                    setNotice(
                      "Select a lead, then use Quick actions to create a record.",
                    );
                  }}
                >
                  Create from lead
                </button>
              </div>
              {workflowList(crm.workflows.filter((w) => w.kind === section))}
            </section>
          )}
          {section === "customers" && (
            <section className="crm-panel">
              <h2>Converted customers</h2>
              {crm.leads
                .filter((l) => l.stage === "CONVERTED")
                .map((l) => (
                  <div className="crm-record" key={l.id}>
                    <div>
                      <h3>{l.name}</h3>
                      <p>
                        {l.location} · {l.phone}
                      </p>
                      <strong>{money(l.project_cost)}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setSelected(l.id);
                        setSection("leads");
                      }}
                    >
                      Open project
                    </button>
                  </div>
                ))}
              {!crm.leads.some((l) => l.stage === "CONVERTED") && (
                <div className="crm-empty">
                  Converted leads will appear here after approval and proposal
                  acceptance.
                </div>
              )}
            </section>
          )}
          {section === "documents" && (
            <section className="crm-panel">
              <h2>Project documents</h2>
              <p>Upload from the Documents tab of a lead.</p>
              {crm.documents.map((d) => (
                <div className="crm-record" key={d.id}>
                  <div>
                    <h3>{d.name}</h3>
                    <p>
                      {crm.leads.find((l) => l.id === d.lead_id)?.name} ·{" "}
                      {Math.ceil(d.size / 1024)} KB
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(() => download(d.id), "Download ready")
                    }
                  >
                    Download
                  </button>
                </div>
              ))}
            </section>
          )}
          {section === "templates" && (
            <section className="crm-panel">
              <div className="crm-section-heading">
                <div>
                  <h2>Communication templates</h2>
                  <p>
                    Use {"{{name}}"}, {"{{reference}}"}, {"{{capacity}}"},{" "}
                    {"{{location}}"} and {"{{employee}}"}.
                  </p>
                </div>
                {admin && (
                  <button className="primary" onClick={() => open("template")}>
                    New template
                  </button>
                )}
              </div>
              <div className="crm-grid-two">
                {crm.templates.map((t) => (
                  <article className="crm-template" key={t.id}>
                    <Badge>{t.channel}</Badge>
                    <h3>{t.title}</h3>
                    <p className="preserve">{t.body}</p>
                    {admin && (
                      <button onClick={() => open("template", { template: t })}>
                        Edit template
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
          {section === "team" && admin && (
            <section className="crm-panel">
              <div className="crm-section-heading">
                <div>
                  <h2>Team & access</h2>
                  <p>Active employees receive new leads automatically.</p>
                </div>
                <button className="primary" onClick={() => open("user")}>
                  Add team member
                </button>
              </div>
              {crm.users
                .filter((u) =>
                  ["ADMIN", "MANAGER", "EMPLOYEE", "FINANCE"].includes(u.role),
                )
                .map((u) => (
                  <div className="crm-record" key={u.id}>
                    <div>
                      <h3>{u.name}</h3>
                      <p>
                        {u.login} · {readable(u.role)} ·{" "}
                        {u.active ? "Active" : "Inactive"}
                      </p>
                      <small>
                        {
                          crm.leads.filter(
                            (l) =>
                              l.assigned_to === u.id &&
                              !["CONVERTED", "LOST"].includes(l.stage),
                          ).length
                        }{" "}
                        open leads
                      </small>
                    </div>
                    {u.id !== crm.user.id && (
                      <button
                        disabled={busy}
                        onClick={() => open("userAccess", { user: u })}
                      >
                        Manage access
                      </button>
                    )}
                  </div>
                ))}
            </section>
          )}
          {section === "settings" && (
            <section className="crm-panel">
              <h2>{crm.user.name}</h2>
              <p>
                {crm.user.login} · {readable(crm.user.role)}
              </p>
              <p>
                Access is controlled by your staff account. Your CRM uses the
                existing AKBS project database.
              </p>
              <button onClick={crm.logout}>Sign out</button>
            </section>
          )}
        </main>
      </div>
      {dialog && (
        <div
          className="crm-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDialog(null);
          }}
        >
          <section
            className="crm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-dialog-title"
          >
            <div className="crm-section-heading">
              <h2 id="crm-dialog-title">
                {
                  (
                    {
                      lead: dialog.lead ? "Edit lead" : "New lead",
                      assign: "Assign employee",
                      note: dialog.call ? "Log a call" : "Add note",
                      stage: "Update lead stage",
                      approval: "Review lead",
                      workflow: dialog.workflow
                        ? "Update record"
                        : "Create " + readable(dialog.workflowKind || ""),
                      template: "Communication template",
                      message: "Prepare message",
                      user: "Add team member",
                      userAccess: "Manage team access",
                    } as any
                  )[dialog.kind]
                }
              </h2>
              <button
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                <X size={20} />
              </button>
            </div>
            {failure && (
              <div role="alert" className="crm-error">
                {failure}
              </div>
            )}
            <WorkspaceForm
              key={
                dialog.kind + (dialog.workflow?.id || dialog.template?.id || "")
              }
              dialog={dialog}
              lead={lead}
              busy={busy}
              onSubmit={async (data) => {
                const ok = await act(
                  async () => {
                    switch (dialog.kind) {
                      case "lead": {
                        const payload = {
                          ...data,
                          capacity: Number(data.capacity),
                          project_cost: Number(data.project_cost),
                        };
                        if (dialog.lead)
                          await crm.command("lead_update", {
                            ...payload,
                            lead_id: dialog.lead.id,
                            version: dialog.lead.version,
                          });
                        else {
                          const r = await crm.command("lead_create", payload);
                          setSelected(r.lead.id);
                          setSection("leads");
                        }
                        break;
                      }
                      case "assign":
                        await changeLead({
                          assigned_to: data.assigned_to || null,
                        });
                        break;
                      case "stage":
                        await changeLead(data);
                        break;
                      case "approval":
                        await changeLead(data);
                        break;
                      case "note":
                        await crm.command("note", {
                          ...data,
                          lead_id: lead.id,
                          kind: dialog.call ? "CALL" : "NOTE",
                        });
                        break;
                      case "workflow":
                        await crm.command(
                          dialog.workflow
                            ? "workflow_update"
                            : "workflow_create",
                          {
                            ...data,
                            id: dialog.workflow?.id,
                            version: dialog.workflow?.version,
                            lead_id: dialog.workflow?.lead_id || lead.id,
                            kind: dialog.workflowKind,
                            due_at: data.due_at
                              ? new Date(data.due_at).toISOString()
                              : null,
                            amount: Number(data.amount || 0),
                            assignee_id: data.assignee_id || null,
                            document_id: dialog.workflow?.document_id || null,
                          },
                        );
                        break;
                      case "template":
                        await crm.command("template_save", {
                          ...data,
                          id: dialog.template?.id,
                        });
                        break;
                      case "user":
                        await crm.command("user_create", {
                          ...data,
                          manager_id: data.manager_id || null,
                        });
                        break;
                      case "userAccess":
                        await crm.command("user_update", {
                          ...data,
                          id: dialog.user.id,
                          manager_id: data.manager_id || null,
                          active: data.active === "true",
                        });
                        break;
                      case "message":
                        await crm.command("note", {
                          lead_id: lead.id,
                          note: `${readable(dialog.channel)} draft prepared: ${data.body}`,
                          shared: false,
                        });
                        break;
                    }
                  },
                  dialog.kind === "message"
                    ? "Message draft opened. Send it from your messaging app."
                    : "Saved successfully",
                );
                if (ok) setDialog(null);
              }}
              onCancel={() => setDialog(null)}
            />
          </section>
        </div>
      )}
      {quote && lead && (
        <SoftQuotationModal
          isOpen
          onClose={() => setQuote(false)}
          initialData={{
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            location: lead.location,
            birdCapacity: lead.capacity,
            poultryType: lead.project_type,
            applicationId: lead.reference,
            leadId: lead.id,
            projectCost: String(lead.project_cost),
            ...lead.details,
          }}
          onQuotationSent={(_id, summary) => {
            void act(
              () =>
                crm.command("note", {
                  lead_id: lead.id,
                  note: `Soft quotation ${summary.quotationNo} draft opened via ${summary.channel}; estimated value ${money(summary.totalProjectCost)}. Delivery not confirmed.`,
                  shared: false,
                }),
              "Quotation draft activity saved. Delivery is not confirmed.",
            );
          }}
        />
      )}
    </div>
  );
}
function WorkspaceForm({
  dialog,
  lead,
  busy,
  onSubmit,
  onCancel,
}: {
  dialog: any;
  lead?: Lead;
  busy: boolean;
  onSubmit: (d: any) => Promise<void>;
  onCancel: () => void;
}) {
  const crm = useCrm();
  const l = dialog.lead;
  const w: Workflow | undefined = dialog.workflow;
  const t: Template | undefined = dialog.template;
  const [channel, setChannel] = useState(
    t?.channel || dialog.channel || "whatsapp",
  );
  const [body, setBody] = useState(t?.body || "");
  const [subject, setSubject] = useState(t?.subject || "");
  const [status, setStatus] = useState(w?.status || "");
  const replace = (s: string) =>
    s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
      (
        (
          ({
            name: lead?.name,
            reference: lead?.reference,
            capacity: lead?.capacity,
            location: lead?.location,
            employee: crm.user.name,
          }) as Record<string, any>
        )[key] ?? ""
      ).toString(),
    );
  const options =
    w?.kind === "proposal"
      ? (
          {
            DRAFT: ["DRAFT", "UNDER_REVIEW"],
            REJECTED: ["REJECTED", "UNDER_REVIEW"],
            UNDER_REVIEW: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
            APPROVED: ["APPROVED", "SENT"],
            SENT: ["SENT", "ACCEPTED", "REJECTED"],
            ACCEPTED: ["ACCEPTED"],
          } as any
        )[w.status]
      : w?.kind === "financing"
        ? (
            {
              NOT_STARTED: ["NOT_STARTED", "DOCUMENTS_PENDING"],
              DOCUMENTS_PENDING: ["DOCUMENTS_PENDING", "SUBMITTED"],
              SUBMITTED: ["SUBMITTED", "UNDER_REVIEW"],
              UNDER_REVIEW: ["UNDER_REVIEW", "SANCTIONED", "REJECTED"],
              SANCTIONED: ["SANCTIONED", "DISBURSED"],
              DISBURSED: ["DISBURSED"],
              REJECTED: ["REJECTED", "DOCUMENTS_PENDING"],
            } as any
          )[w.status]
        : w?.kind === "task"
          ? ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
          : w?.kind === "visit"
            ? ["SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"]
            : ["SCHEDULED", "COMPLETED", "CANCELLED"];
  const roleOptions =
    crm.user.role === "EMPLOYEE" && w?.kind === "proposal"
      ? options.filter((s: string) =>
          ["DRAFT", "UNDER_REVIEW", "REJECTED"].includes(s),
        )
      : options;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const data: any = Object.fromEntries(new FormData(e.currentTarget));
        if (dialog.kind === "lead") {
          data.details = {
            state: data.state,
            district: data.district,
            shedType: data.shedType,
            landArea: data.landArea,
            landOwnership: data.landOwnership,
            loanRequired: data.loanRequired,
            experience: data.experience,
          };
          for (const k of Object.keys(data.details)) delete data[k];
        }
        if (dialog.kind === "message") {
          const phone = lead?.phone.replace(/\D/g, "") || "";
          const num = phone.length === 10 ? "91" + phone : phone;
          const url =
            dialog.channel === "whatsapp"
              ? `https://wa.me/${num}?text=${encodeURIComponent(body)}`
              : `mailto:${encodeURIComponent(lead?.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          if (dialog.channel === "whatsapp" && !/^\d{8,15}$/.test(num)) {
            alert("This lead needs a valid phone number.");
            return;
          }
          if (dialog.channel === "email" && !lead?.email) {
            alert("Add an email address to this lead first.");
            return;
          }
          window.open(url, "_blank", "noopener,noreferrer");
        }
        await onSubmit(data);
      }}
    >
      <div className="crm-form-grid">
        {dialog.kind === "lead" && (
          <>
            <Field label="Full name">
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={l?.name}
              />
            </Field>
            <Field label="Phone">
              <input
                name="phone"
                required
                type="tel"
                pattern="[+0-9 ()-]{8,20}"
                defaultValue={l?.phone}
              />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={l?.email} />
            </Field>
            <Field label="Location">
              <input name="location" defaultValue={l?.location} />
            </Field>
            <Field label="Project type">
              <select
                name="project_type"
                defaultValue={l?.project_type || "Broiler"}
              >
                {[
                  "Broiler",
                  "Layer",
                  "Breeder",
                  "Country Chicken / Desi",
                  "Other",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Bird capacity">
              <input
                name="capacity"
                type="number"
                min="0"
                max="10000000"
                step="1"
                required
                defaultValue={l?.capacity || 0}
              />
            </Field>
            <Field label="Estimated cost (₹)">
              <input
                name="project_cost"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={l?.project_cost || 0}
              />
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue={l?.priority || "NORMAL"}>
                {["LOW", "NORMAL", "HIGH"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            {[
              "state",
              "district",
              "shedType",
              "landArea",
              "landOwnership",
              "loanRequired",
              "experience",
            ].map((k) => (
              <Field
                key={k}
                label={k
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase())}
              >
                <input name={k} defaultValue={l?.details?.[k] || ""} />
              </Field>
            ))}
            <Field label="Customer requirements">
              <textarea name="message" rows={4} defaultValue={l?.message} />
            </Field>
          </>
        )}
        {dialog.kind === "assign" && (
          <Field label="Active employee">
            <select name="assigned_to" defaultValue={lead?.assigned_to || ""}>
              <option value="">Unassigned</option>
              {crm.users
                .filter((u) => u.active && u.role === "EMPLOYEE")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {dialog.kind === "stage" && (
          <>
            <Field label="Stage">
              <select
                name="stage"
                defaultValue={lead?.stage}
                onChange={(e) => setStatus(e.target.value)}
              >
                {Object.entries(stages).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason (required for Lost)">
              <textarea name="reason" required={status === "LOST"} />
            </Field>
            <p>
              Proposal, financing and conversion stages require their supporting
              records and approvals.
            </p>
          </>
        )}
        {dialog.kind === "approval" && (
          <Field label="Approval decision">
            <select name="approval" defaultValue={lead?.approval}>
              {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        {dialog.kind === "note" && (
          <>
            <Field label={dialog.call ? "Call outcome / next step" : "Note"}>
              <textarea name="note" required maxLength={20000} rows={5} />
            </Field>
            <Field label="Visibility">
              <select name="shared">
                <option value="false">Internal team</option>
                <option value="true">Shared with customer portal</option>
              </select>
            </Field>
          </>
        )}
        {dialog.kind === "workflow" && (
          <>
            <Field label="Title">
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={w?.title}
              />
            </Field>
            <Field label="Status">
              <select
                name="status"
                defaultValue={
                  w?.status ||
                  (dialog.workflowKind === "proposal"
                    ? "DRAFT"
                    : dialog.workflowKind === "financing"
                      ? "NOT_STARTED"
                      : dialog.workflowKind === "task"
                        ? "OPEN"
                        : "SCHEDULED")
                }
              >
                {(w
                  ? roleOptions
                  : dialog.workflowKind === "proposal"
                    ? ["DRAFT"]
                    : dialog.workflowKind === "financing"
                      ? ["NOT_STARTED", "DOCUMENTS_PENDING"]
                      : dialog.workflowKind === "task"
                        ? ["OPEN"]
                        : ["SCHEDULED"]
                ).map((s: string) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Due date & time">
              <input
                name="due_at"
                type="datetime-local"
                required={["task", "followup", "visit"].includes(
                  dialog.workflowKind,
                )}
                defaultValue={
                  w?.due_at
                    ? new Date(
                        new Date(w.due_at).getTime() -
                          new Date(w.due_at).getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
            </Field>
            <Field label="Assigned to">
              <select
                name="assignee_id"
                defaultValue={w?.assignee_id || crm.user.id}
              >
                {crm.users
                  .filter(
                    (u) =>
                      u.active &&
                      ["ADMIN", "MANAGER", "EMPLOYEE", "FINANCE"].includes(
                        u.role,
                      ),
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
            {["proposal", "financing"].includes(dialog.workflowKind) && (
              <Field label="Amount (₹)">
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={w?.amount || 0}
                />
              </Field>
            )}
            {dialog.workflowKind === "financing" && (
              <Field label="Bank">
                <input name="bank" defaultValue={w?.bank} />
              </Field>
            )}
            {dialog.workflowKind === "visit" && (
              <Field label="Visit location">
                <input
                  name="location"
                  required
                  defaultValue={w?.location || lead?.location}
                />
              </Field>
            )}
            <Field label="Notes">
              <textarea name="notes" rows={4} defaultValue={w?.notes} />
            </Field>
            <Field label="Visibility">
              <select name="shared" defaultValue={String(w?.shared || false)}>
                <option value="false">Internal team</option>
                <option value="true">Shared with customer portal</option>
              </select>
            </Field>
            {dialog.workflowKind === "proposal" && (
              <p>
                Mark SENT only after sending the proposal yourself. Mark
                ACCEPTED only after customer confirmation.
              </p>
            )}
          </>
        )}
        {(dialog.kind === "template" || dialog.kind === "message") && (
          <>
            {dialog.kind === "template" ? (
              <>
                <Field label="Template title">
                  <input required name="title" defaultValue={t?.title} />
                </Field>
                <Field label="Channel">
                  <select
                    name="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </Field>
              </>
            ) : (
              <Field label="Choose template">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const selected = crm.templates.find(
                      (t) => t.id === e.target.value,
                    );
                    if (selected) {
                      setBody(replace(selected.body));
                      setSubject(replace(selected.subject));
                    }
                  }}
                >
                  <option value="">Choose a template or write a message</option>
                  {crm.templates
                    .filter((t) => t.channel === channel)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {channel === "email" && (
              <Field label="Subject">
                <input
                  name="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Field>
            )}
            <Field label="Message">
              <textarea
                name="body"
                rows={8}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            {dialog.kind === "message" && (
              <p>
                This opens a draft. Review and send it in WhatsApp or your email
                app.
              </p>
            )}
          </>
        )}
        {(dialog.kind === "user" || dialog.kind === "userAccess") && (
          <>
            {dialog.kind === "user" && (
              <>
                <Field label="Full name">
                  <input name="name" required />
                </Field>
                <Field label="Login email">
                  <input
                    name="login"
                    type="email"
                    required
                    autoComplete="off"
                  />
                </Field>
                <Field label="Temporary password (12–72 characters)">
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={72}
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}
            <Field label="Role">
              <select
                name="role"
                defaultValue={dialog.user?.role || "EMPLOYEE"}
              >
                {["EMPLOYEE", "MANAGER", "FINANCE", "ADMIN"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Manager">
              <select
                name="manager_id"
                defaultValue={dialog.user?.manager_id || ""}
              >
                <option value="">No manager</option>
                {crm.users
                  .filter((u) => u.role === "MANAGER" && u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
            {dialog.kind === "userAccess" && (
              <>
                <Field label="Account status">
                  <select
                    name="active"
                    defaultValue={String(dialog.user.active)}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </Field>
                <p>
                  Existing sessions are revoked when access changes. Reassign
                  existing leads separately if needed.
                </p>
              </>
            )}
            {dialog.kind === "user" && (
              <p>
                Share the temporary credentials privately. The employee must set
                a new password at first login.
              </p>
            )}
          </>
        )}
      </div>
      <div className="crm-form-footer">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy
            ? "Saving…"
            : dialog.kind === "message"
              ? "Open message draft"
              : "Save"}
        </button>
      </div>
    </form>
  );
}
