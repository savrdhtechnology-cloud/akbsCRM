import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AkbsLogo } from "../components/AkbsLogo";
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
    const run = () => {
      if (document.visibilityState === "visible")
        void refresh().catch(() => {});
    };
    const timer = setInterval(run, 30000);
    window.addEventListener("focus", run);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", run);
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
  if (loading)
    return <div className="crm-login">Loading your workspace…</div>;
  if (!user || user.must_change_password)
    return (
      <div className="crm-login">
        <form
          className="crm-login-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const result = await rpc(
                user ? "password" : "login",
                user
                  ? {
                      current_password: f.get("current"),
                      password: f.get("password"),
                    }
                  : { login: f.get("login"), password: f.get("password") },
                token,
              );
              sessionStorage.setItem("akbs-workspace-session", result.token);
              setUser(null);
              setToken(result.token);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <AkbsLogo size="lg" />
          <span className="crm-eyebrow">YOUR GROWTH WORKSPACE</span>
          <h1>{user ? "Set your new password" : "Welcome to AKBS CRM"}</h1>
          <p>
            {user
              ? "Enter your temporary password and choose a new password."
              : "Sign in with your existing AKBS staff account."}
          </p>
          {!user ? (
            <label>
              Email / Login
              <input
                name="login"
                required
                autoComplete="username"
                type="text"
              />
            </label>
          ) : (
            <label>
              Current password
              <input
                name="current"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
          )}
          <label>
            {user ? "New password" : "Password"}
            <input
              name="password"
              type="password"
              required
              minLength={user ? 12 : 1}
              maxLength={72}
              autoComplete={user ? "new-password" : "current-password"}
            />
          </label>
          {error && (
            <p role="alert" className="crm-error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : user
                ? "Save password"
                : "Sign in securely"}
          </button>
        </form>
      </div>
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
