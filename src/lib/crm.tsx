import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AkbsLogo } from "../components/AkbsLogo";
import broilerHeroImg from "../assets/images/broiler_farmer_hero_1790287489096.jpg";
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
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [authNotice, setAuthNotice] = useState("");
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
    if (!user || user.must_change_password)
    return (
      <div className="crm-login">
        <div className="crm-login-shell">
          <section
            className="crm-login-visual"
            aria-label="AKBS CRM overview"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(247,251,248,.98) 0%, rgba(247,251,248,.90) 38%, rgba(247,251,248,.26) 72%, rgba(5,50,34,.12) 100%), url(${broilerHeroImg})`,
            }}
          >
            <div className="crm-login-brand">
              <AkbsLogo size="lg" />
            </div>

            <div className="crm-login-visual-copy">
              <span className="crm-login-kicker">AKBS POULTRY FARMING</span>
              <h2>
                Empowering Poultry Entrepreneurs
                <span>Across India</span>
              </h2>
              <p>
                A complete CRM to manage inquiries, customers, projects,
                documentation, financing and growth — all in one place.
              </p>
            </div>

            <div className="crm-login-feature-list">
              <div><b>01</b><p><strong>Manage Customers</strong><span>From inquiry to project</span></p></div>
              <div><b>02</b><p><strong>Track Projects</strong><span>DPR, proposals & financing</span></p></div>
              <div><b>03</b><p><strong>Team Productivity</strong><span>Live activity, tasks & reports</span></p></div>
              <div><b>04</b><p><strong>Partner Growth</strong><span>Partner records & business support</span></p></div>
            </div>

            <div className="crm-login-trust">
              <span>Modern Farming Solutions</span>
              <span>Expert Technical Support</span>
              <span>End-to-End Project Assistance</span>
            </div>
          </section>

          <section className="crm-login-panel">
            <div className="crm-login-card">
              <div className="crm-login-mobile-brand"><AkbsLogo size="md" /></div>

              {user ? (
                <form
                  className="crm-auth-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    const f = new FormData(e.currentTarget);
                    try {
                      const result = await rpc(
                        "password",
                        {
                          current_password: f.get("current"),
                          password: f.get("password"),
                        },
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
                  <div className="crm-login-heading">
                    <span className="crm-eyebrow">SECURE ACCOUNT SETUP</span>
                    <h1>Set your new password</h1>
                    <p>Replace your temporary password before accessing the CRM.</p>
                  </div>
                  <div className="crm-login-fields">
                    <label>
                      <span>Current password</span>
                      <input name="current" type="password" required autoComplete="current-password" placeholder="Enter temporary password" />
                    </label>
                    <label>
                      <span>New password</span>
                      <input name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" placeholder="Create a secure new password" />
                    </label>
                  </div>
                  {error && <p role="alert" className="crm-error">{error}</p>}
                  <button className="primary crm-login-submit" disabled={busy}>
                    {busy ? "Please wait…" : "Save password & continue →"}
                  </button>
                </form>
              ) : authMode === "login" ? (
                <form
                  className="crm-auth-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    setAuthNotice("");
                    const f = new FormData(e.currentTarget);
                    try {
                      const result = await rpc(
                        "login",
                        { login: f.get("login"), password: f.get("password") },
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
                  <div className="crm-login-heading">
                    <span className="crm-eyebrow">WELCOME TO</span>
                    <h1>AKBS CRM</h1>
                    <p>Sign in with your registered AKBS staff account to access the CRM dashboard.</p>
                  </div>

                  <div className="crm-login-fields">
                    <label>
                      <span>Email / Login ID</span>
                      <input name="login" required autoComplete="username" type="text" placeholder="Enter your email or login ID" />
                    </label>
                    <label>
                      <span>Password</span>
                      <input name="password" type="password" required minLength={1} maxLength={72} autoComplete="current-password" placeholder="Enter your password" />
                    </label>
                  </div>

                  <div className="crm-auth-row">
                    <span className="crm-auth-helper">Registered staff access only</span>
                    <button
                      type="button"
                      className="crm-text-action"
                      onClick={() => { setAuthMode("forgot"); setError(""); setAuthNotice(""); }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {error && <p role="alert" className="crm-error">{error}</p>}
                  {authNotice && <p role="status" className="crm-success">{authNotice}</p>}

                  <button className="primary crm-login-submit" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in securely →"}
                  </button>

                  <div className="crm-login-divider"><span>New to AKBS CRM?</span></div>
                  <button
                    type="button"
                    className="crm-signup-link"
                    onClick={() => { setAuthMode("signup"); setError(""); setAuthNotice(""); }}
                  >
                    Create account / Sign up
                  </button>

                  <div className="crm-login-footer-note">
                    CRM access is granted only after AKBS admin approval.
                  </div>
                </form>
              ) : authMode === "signup" ? (
                <form
                  className="crm-auth-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    setAuthNotice("");
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    try {
                      await rpc(
                        "website_inquiry",
                        {
                          name: f.get("name"),
                          email: f.get("email"),
                          phone: f.get("phone"),
                          message: `CRM STAFF SIGN-UP REQUEST | Role: ${f.get("role")} | Department: ${f.get("department")} | Login requested from crm.akbspoultry.com`,
                          rate_key: String(f.get("email") || f.get("phone") || "crm-signup"),
                        },
                        "",
                      );
                      setAuthNotice("Sign-up request submitted. An AKBS administrator must approve and create your staff login before you can access the CRM.");
                      form.reset();
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="crm-login-heading">
                    <span className="crm-eyebrow">NEW STAFF ACCESS</span>
                    <h1>Request an account</h1>
                    <p>Submit your details. Creating this request does not give immediate CRM access.</p>
                  </div>

                  <div className="crm-login-fields crm-signup-grid">
                    <label><span>Full Name</span><input name="name" required type="text" placeholder="Enter full name" /></label>
                    <label><span>Mobile Number</span><input name="phone" required type="tel" placeholder="+91" /></label>
                    <label className="crm-span-2"><span>Official Email</span><input name="email" required type="email" placeholder="name@akbspoultry.com" /></label>
                    <label><span>Department</span><input name="department" required type="text" placeholder="Sales / Finance / Operations" /></label>
                    <label>
                      <span>Requested Role</span>
                      <select name="role" required defaultValue="">
                        <option value="" disabled>Select role</option>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="MANAGER">Manager</option>
                        <option value="FINANCE">Finance</option>
                      </select>
                    </label>
                  </div>

                  {error && <p role="alert" className="crm-error">{error}</p>}
                  {authNotice && <p role="status" className="crm-success">{authNotice}</p>}

                  <button className="primary crm-login-submit" disabled={busy}>
                    {busy ? "Submitting…" : "Submit sign-up request →"}
                  </button>
                  <button
                    type="button"
                    className="crm-back-login"
                    onClick={() => { setAuthMode("login"); setError(""); setAuthNotice(""); }}
                  >
                    ← Already registered? Back to login
                  </button>
                </form>
              ) : (
                <form
                  className="crm-auth-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    setAuthNotice("");
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    try {
                      await rpc(
                        "website_inquiry",
                        {
                          name: String(f.get("login") || "CRM user"),
                          email: f.get("email"),
                          phone: f.get("phone"),
                          message: `CRM PASSWORD RESET REQUEST | Login ID: ${f.get("login")} | Requested from crm.akbspoultry.com`,
                          rate_key: String(f.get("login") || f.get("email") || f.get("phone") || "crm-reset"),
                        },
                        "",
                      );
                      setAuthNotice("Password reset request submitted. AKBS admin will verify your account and help reset your access.");
                      form.reset();
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="crm-login-heading">
                    <span className="crm-eyebrow">ACCOUNT RECOVERY</span>
                    <h1>Forgot password?</h1>
                    <p>Send a verified reset request. Your CRM password is not changed until AKBS admin confirms your account.</p>
                  </div>

                  <div className="crm-login-fields">
                    <label><span>Email / Login ID</span><input name="login" required type="text" placeholder="Enter registered login ID" /></label>
                    <label><span>Registered Email</span><input name="email" required type="email" placeholder="Enter registered email" /></label>
                    <label><span>Registered Mobile Number</span><input name="phone" required type="tel" placeholder="+91" /></label>
                  </div>

                  {error && <p role="alert" className="crm-error">{error}</p>}
                  {authNotice && <p role="status" className="crm-success">{authNotice}</p>}

                  <button className="primary crm-login-submit" disabled={busy}>
                    {busy ? "Submitting…" : "Request password reset →"}
                  </button>
                  <button
                    type="button"
                    className="crm-back-login"
                    onClick={() => { setAuthMode("login"); setError(""); setAuthNotice(""); }}
                  >
                    ← Back to login
                  </button>
                </form>
              )}

              <div className="crm-security-note">
                Secure staff portal · Valid Login ID and Password are required for CRM access.
              </div>
            </div>
          </section>
        </div>
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
