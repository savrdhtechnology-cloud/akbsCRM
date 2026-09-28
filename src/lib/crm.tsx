import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AkbsLogo } from "../components/AkbsLogo";
import { AuthPortal } from "../components/AuthPortal";
const databaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ldffgetuzoeupuhoaubn.supabase.co";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By";
export interface User {
  id: string;
  name: string;
  login: string;
  role: string;
  active: boolean;
  profile?: Record<string, any>;
  manager_id: string | null;
  must_change_password: boolean;
}
export interface Lead {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  source: string;
  stage: string;
  approval: string;
  priority: string;
  assigned_to: string | null;
  capacity: number;
  project_cost: number;
  project_type: string;
  message: string;
  details: Record<string, any>;
  version: number;
  created_at: string;
}
export interface Workflow {
  id: string;
  lead_id: string;
  kind: string;
  title: string;
  status: string;
  due_at: string | null;
  notes: string;
  amount: number;
  bank: string;
  location: string;
  document_id: string | null;
  assignee_id: string | null;
  shared: boolean;
  version: number;
}
export interface Template {
  id: string;
  title: string;
  channel: string;
  subject: string;
  body: string;
}
export interface Document {
  id: string;
  lead_id: string;
  name: string;
  category: string;
  size: number;
  mime: string;
  created_at: string;
}
export interface Activity {
  id: string;
  lead_id: string;
  actor_name: string;
  action: string;
  note: string;
  created_at: string;
  shared: boolean;
}
interface Snapshot {
  records: any[];
  leads: Lead[];
  users: User[];
  workflows: Workflow[];
  templates: Template[];
  documents: Document[];
  activities: Activity[];
  total: number;
}
const empty: Snapshot = {
  records: [],
  leads: [],
  users: [],
  workflows: [],
  templates: [],
  documents: [],
  activities: [],
  total: 0,
};
async function quoteEmailRpc(id: string, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_send_approved_soft_quotation_email`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_quotation_id: id, p_token: token }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to send quotation email.");
  if (out?.error) throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}

async function paymentQrUploadRpc(file: { name: string; type: string; data: string }, token: string) {
  const response = await fetch(`${databaseUrl}/functions/v1/akbs-admin-payment-qr-upload`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ token, file }),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.error || out.message || "Unable to upload payment QR.");
  return out;
}

async function paymentAccountsRpc(action: string, data: Record<string, any>, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_payment_accounts_staff`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_token: token, p_data: data }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to reach payment account service.");
  if (out?.error) throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}

async function feeTransactionsRpc(action: string, data: Record<string, any>, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_fee_transactions_staff`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_token: token, p_data: data }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to reach fee transactions service.");
  if (out?.error) throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}

async function feeEventsRpc(action: string, data: Record<string, any>, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_fee_events_staff`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_token: token, p_data: data }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to reach fee events service.");
  if (out?.error) throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}

async function publicFeeConfigRpc() {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_fee_public_config`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to load fee configuration.");
  return out;
}

async function feeRpc(action: string, data: Record<string, any>, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_fee_staff`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_token: token, p_data: data }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to reach fee management service.");
  if (out?.error) throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}

async function quoteRpc(action: string, data: Record<string, any>, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_soft_quotation_workspace`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_data: data, p_token: token }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to reach quotation service.");
  if (out?.error) throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}

async function rpc(action: string, data: Record<string, any>, token: string) {
  const response = await fetch(`${databaseUrl}/rest/v1/rpc/akbs_crm_workspace`, {
    method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({p_action: action, p_data: data, p_token: token}),
    signal: AbortSignal.timeout(20000), cache: "no-store",
  });
  const out = await response.json();
  if (!response.ok) throw new Error(out.message || "Unable to reach the CRM database. Please retry.");
  if (out?.error)
    throw Object.assign(new Error(out.error), { status: out.status });
  return out;
}
interface Context extends Snapshot {
  user: User;
  refresh: () => Promise<void>;
  command: (a: string, d?: Record<string, any>) => Promise<any>;
  read: (a: string, d: Record<string, any>) => Promise<any>;
  quotation: (a: string, d?: Record<string, any>) => Promise<any>;
  sendQuotationEmail: (id: string) => Promise<any>;
  fee: (action: string, data?: Record<string, any>) => Promise<any>;
  publicFeeConfig: () => Promise<any>;
  feeEvents: (action: string, data?: Record<string, any>) => Promise<any>;
  feeTransactions: (action: string, data?: Record<string, any>) => Promise<any>;
  paymentAccounts: (action: string, data?: Record<string, any>) => Promise<any>;
  uploadPaymentQr: (file: { name: string; type: string; data: string }) => Promise<any>;
  logout: () => void;
  error: string;
  loading: boolean;
}
const CrmContext = createContext<Context | null>(null);
export const useCrm = () => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("CRM provider missing");
  return ctx;
};
export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("akbs-workspace-session") || "",
  );
  const [user, setUser] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState(empty);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const clear = useCallback(() => {
    request.current++;
    sessionStorage.removeItem("akbs-workspace-session");
    setToken("");
    setUser(null);
    setSnapshot(empty);
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    try {
      const first = await rpc("snapshot", {}, token);
      const leads = [...first.leads];
      for (let page = 1; leads.length < first.total; page++) {
        const next = await rpc("snapshot", { page }, token);
        if (!next.leads.length) break;
        leads.push(...next.leads);
      }
      if (id === request.current) {
        setSnapshot({ ...first, leads });
        setUser(first.user);
        setError("");
      }
    } catch (e: any) {
      if (id === request.current) {
        setError(e.message);
        if (e.status === 401) clear();
      }
      throw e;
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [token, clear]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    rpc("me", {}, token)
      .then(async (r) => {
        if (!active) return;
        setUser(r.user);
        if (!r.user.must_change_password) await refresh();
        else setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          clear();
        }
      });
    return () => {
      active = false;
    };
  }, [token, refresh, clear]);
  useEffect(() => {
    if (!user || user.must_change_password) return;

    let stopped = false;
    let inFlight = false;

    const run = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        await refresh();
      } catch {
        // Background sync is silent; existing data remains available.
      } finally {
        inFlight = false;
      }
    };

    // Keep every staff portal continuously synced to the same source database.
    const timer = window.setInterval(() => void run(), 2000);
    const onFocus = () => void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [!!user, user?.must_change_password, refresh]);
  const command = async (a: string, d: Record<string, any> = {}) => {
    const out = await rpc(a, d, token);
    try {
      await refresh();
    } catch {
      setError(
        "Saved, but refresh failed. Please refresh before editing again.",
      );
    }
    return out;
  };
  const login = async (login: string, password: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await rpc("login", { login, password }, token);
      sessionStorage.setItem("akbs-workspace-session", result.token);
      setUser(null);
      setToken(result.token);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const changePassword = async (currentPassword: string, newPassword: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await rpc("password", { current_password: currentPassword, password: newPassword }, token);
      sessionStorage.setItem("akbs-workspace-session", result.token);
      setUser(null);
      setToken(result.token);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const submitAccessRequest = async (data: {name:string;phone:string;email:string;department:string;role:string}) => {
    setBusy(true);
    setError("");
    try {
      await rpc("website_inquiry", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: `CRM STAFF SIGN-UP REQUEST | Role: ${data.role} | Department: ${data.department}`,
        rate_key: data.email || data.phone || "crm-signup",
      }, "");
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const submitResetRequest = async (data: {login:string;email:string;phone:string}) => {
    setBusy(true);
    setError("");
    try {
      await rpc("website_inquiry", {
        name: data.login || "CRM user",
        email: data.email,
        phone: data.phone,
        message: `CRM PASSWORD RESET REQUEST | Login ID: ${data.login}`,
        rate_key: data.login || data.email || data.phone || "crm-reset",
      }, "");
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <div className="crm-login crm-login-loading">
        <div className="crm-login-loader-card">
          <AkbsLogo size="md" />
          <div className="crm-login-spinner" aria-hidden="true" />
          <p>Preparing your secure workspace…</p>
        </div>
      </div>
    );
  if (!user || user.must_change_password)
    return (
      <AuthPortal
        user={user}
        busy={busy}
        error={error}
        onLogin={login}
        onPasswordChange={changePassword}
        onSignupRequest={submitAccessRequest}
        onResetRequest={submitResetRequest}
      />
    );
  if (!["ADMIN", "MANAGER", "EMPLOYEE", "FINANCE"].includes(user.role))
    return (
      <div className="crm-login">
        <div className="crm-login-card">
          <AkbsLogo />
          <h1>Staff account required</h1>
          <p>Sign in with an AKBS staff account to access the CRM workspace.</p>
          <button onClick={clear}>Back to sign in</button>
        </div>
      </div>
    );
  return (
    <CrmContext.Provider
      value={{
        ...snapshot,
        user,
        loading,
        error,
        refresh,
        command,
        read: (a, d) => rpc(a, d, token),
        quotation: (a, d = {}) => quoteRpc(a, d, token),
        sendQuotationEmail: (id) => quoteEmailRpc(id, token),
        fee: (a, d = {}) => feeRpc(a, d, token),
        publicFeeConfig: () => publicFeeConfigRpc(),
        feeEvents: (a, d = {}) => feeEventsRpc(a, d, token),
        feeTransactions: (a, d = {}) => feeTransactionsRpc(a, d, token),
        paymentAccounts: (a, d = {}) => paymentAccountsRpc(a, d, token),
        uploadPaymentQr: (file) => paymentQrUploadRpc(file, token),
        logout: () => {
          void rpc("logout", {}, token)
            .catch(() => {})
            .finally(clear);
        },
      }}
    >
      {children}
    </CrmContext.Provider>
  );
}
