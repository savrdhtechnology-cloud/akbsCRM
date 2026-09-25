import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Briefcase,
  Handshake,
  Lock,
  Key,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  Settings,
  Plus,
  Eye,
  Sliders,
  Check,
  X
} from 'lucide-react';
import { PortalRole, PortalUser } from '../../types';

interface AdminControlViewProps {
  currentRole: PortalRole;
  onSelectRole: (role: PortalRole) => void;
  portalUsers: PortalUser[];
  onOpenSection: (section: any) => void;
}

export const AdminControlView: React.FC<AdminControlViewProps> = ({
  currentRole,
  onSelectRole,
  portalUsers,
  onOpenSection
}) => {
  const [users, setUsers] = useState<PortalUser[]>(portalUsers);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<PortalRole>('employee');
  const [newUserRoleTitle, setNewUserRoleTitle] = useState('Field Supervisor');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName) return;
    const created: PortalUser = {
      id: `usr-${Date.now()}`,
      name: newUserName,
      role: newUserRole,
      roleTitle: newUserRoleTitle,
      email: newUserEmail || `${newUserName.toLowerCase().replace(/\s+/g, '')}@akbspoultry.com`,
      phone: '+91 98200 00000',
      departmentOrCompany: newUserRole === 'partner' ? 'Supplier Partner' : 'Operations',
      avatarLetter: newUserName.charAt(0).toUpperCase()
    };
    setUsers([...users, created]);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
  };

  const portalCards = [
    {
      role: 'admin' as PortalRole,
      title: 'Super Admin Portal',
      tag: 'Full Master Control',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-700" />,
      desc: 'Complete read, write, financial approvals, mandi rates, user access, and system configuration.',
      metrics: 'All 14 Modules • Full DB Access • Master Overrides',
      navTarget: 'dashboard'
    },
    {
      role: 'manager' as PortalRole,
      title: 'Operations Manager Portal',
      tag: 'Branch & Team Head',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <Briefcase className="w-5 h-5 text-amber-700" />,
      desc: 'DPR authorizations, lead re-allocation, supervisor audit checks, and regional targets.',
      metrics: 'Pending Approvals • Lead Assignment • Farm Feasibility',
      navTarget: 'manager-portal'
    },
    {
      role: 'employee' as PortalRole,
      title: 'Employee & Field Staff Portal',
      tag: 'Field Consultant View',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: <Users className="w-5 h-5 text-blue-700" />,
      desc: 'GPS check-in, my assigned farmers, farm site inspection log (water TDS, land, power), and commissions.',
      metrics: 'My Leads • Daily Tasks • Site Visit Logger • Incentives',
      navTarget: 'employee-portal'
    },
    {
      role: 'partner' as PortalRole,
      title: 'Partner & Supplier Portal',
      tag: 'Hatchery & Feed Vendor',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: <Handshake className="w-5 h-5 text-purple-700" />,
      desc: 'Orders for Day Old Chicks (DOC), Feed bags, equipment dispatches, invoices, and ledger settlements.',
      metrics: 'DOC / Feed Indents • Delivery Challans • Settlements',
      navTarget: 'partner-portal'
    }
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Portals & Role-Based Access Control (RBAC)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0b2818] text-white">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch between portals, configure permissions, and monitor activity across Management, Staff, and Partners
          </p>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-3.5 py-2 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Portal User</span>
        </button>
      </div>

      {/* Switchboard: 4 Portals */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <span>Active Portal Switchboard</span>
          <span className="text-xs font-normal text-slate-500">
            (Select any portal to instantly view and manage)
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {portalCards.map((card) => {
            const isCurrent = currentRole === card.role;
            return (
              <div
                key={card.role}
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between relative shadow-xs ${
                  isCurrent
                    ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-xs">
                    Current Active Role
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${card.badgeColor}`}>
                      {card.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {card.metrics}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectRole(card.role);
                      onOpenSection(card.navTarget);
                    }}
                    className={`w-full py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <span>{isCurrent ? 'Open Portal' : 'Switch & Open'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              AKBS Multi-Portal Permissions Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Granular access control defined for each stakeholder tier
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Admin Can Manage All
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Module / Capability</th>
                <th className="py-2.5 px-3 text-center">Super Admin</th>
                <th className="py-2.5 px-3 text-center">Manager Portal</th>
                <th className="py-2.5 px-3 text-center">Employee Portal</th>
                <th className="py-2.5 px-3 text-center">Partner Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Leads & Inquiries</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full Control</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">Re-allocate & View All</td>
                <td className="py-2.5 px-3 text-center text-blue-600 font-medium">Only Assigned Leads</td>
                <td className="py-2.5 px-3 text-center text-slate-400">Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">DPR Proposals & Sanctions</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full Approval & Edit</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">Authorize / Reject</td>
                <td className="py-2.5 px-3 text-center text-blue-600 font-medium">Draft & Generate</td>
                <td className="py-2.5 px-3 text-center text-slate-400">Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Farm Feasibility & Site Visits</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full Audit Access</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">Approve Site Reports</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">GPS Log & Water TDS</td>
                <td className="py-2.5 px-3 text-center text-slate-400">Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">DOC / Feed Supply Orders</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Payment Clearance</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">Authorize Indents</td>
                <td className="py-2.5 px-3 text-center text-blue-600 font-medium">View Delivery Status</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Dispatch & Invoices</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">Mandi Broiler Daily Rates</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Update & Set Rates</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">View Rate Board</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">View Rate Board</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">Supply Price Catalog</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900">User & Staff Provisioning</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Super Admin Only</td>
                <td className="py-2.5 px-3 text-center text-slate-400">Restricted</td>
                <td className="py-2.5 px-3 text-center text-slate-400">Restricted</td>
                <td className="py-2.5 px-3 text-center text-slate-400">Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Portal Users */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          Provisioned Portal Users ({users.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0b2818] text-white flex items-center justify-center font-bold text-sm">
                  {u.avatarLetter}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                  <div className="text-[11px] text-slate-500">{u.roleTitle}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  u.role === 'admin'
                    ? 'bg-emerald-100 text-emerald-800'
                    : u.role === 'manager'
                    ? 'bg-amber-100 text-amber-800'
                    : u.role === 'employee'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {u.role.toUpperCase()}
                </span>
                <button
                  onClick={() => {
                    onSelectRole(u.role);
                    onOpenSection(
                      u.role === 'admin'
                        ? 'dashboard'
                        : u.role === 'manager'
                        ? 'manager-portal'
                        : u.role === 'employee'
                        ? 'employee-portal'
                        : 'partner-portal'
                    );
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md transition-colors"
                >
                  Log As
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Provision User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Provision Portal User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Agrawal"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Email</label>
                <input
                  type="email"
                  placeholder="name@akbspoultry.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Portal Access</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as PortalRole)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="admin">Super Admin</option>
                    <option value="manager">Manager Portal</option>
                    <option value="employee">Employee Portal</option>
                    <option value="partner">Partner Portal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role Title</label>
                  <input
                    type="text"
                    value={newUserRoleTitle}
                    onChange={(e) => setNewUserRoleTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg font-bold shadow-xs"
                >
                  Create Portal User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
