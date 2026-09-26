import React, { useState } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Plus,
  Send,
  X,
  CreditCard,
  TrendingUp,
  Download,
  AlertCircle
} from 'lucide-react';
import { PartnerSupplyOrder } from '../../types';

interface PartnerPortalViewProps {
  orders: PartnerSupplyOrder[];
  onUpdateOrderStatus: (orderId: string, status: PartnerSupplyOrder['status'], challan?: string) => void;
  onSwitchPortal?: (portal: 'admin' | 'manager' | 'employee') => void;
  isAdminViewing?: boolean;
}

export const PartnerPortalView: React.FC<PartnerPortalViewProps> = ({
  orders,
  onUpdateOrderStatus,
  onSwitchPortal,
  isAdminViewing = true
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices' | 'catalog'>('orders');
  const [showRateCardEditor, setShowRateCardEditor] = useState(false);
  const [docRate, setDocRate] = useState(36);
  const [feedRate, setFeedRate] = useState(2125);
  const [equipmentRate, setEquipmentRate] = useState(145);

  const exportStatement = () => {
    const rows = [
      ['Order ID','Item','Farmer','Amount','Challan','Status'],
      ...orders.map(o => [o.id,o.itemDescription,o.farmerName,String(o.totalAmount),o.dispatchChallanNo || '',o.status])
    ];
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='partner-statement.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const [selectedOrder, setSelectedOrder] = useState<PartnerSupplyOrder | null>(null);
  const [challanInput, setChallanInput] = useState('');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);

  // Filter pending vs completed
  const pendingOrders = orders.filter(o => o.status !== 'Payment Settled');
  const totalBilled = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const settledAmount = orders
    .filter(o => o.status === 'Payment Settled')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingAmount = totalBilled - settledAmount;

  const handleOpenDispatch = (order: PartnerSupplyOrder) => {
    setSelectedOrder(order);
    setChallanInput(order.dispatchChallanNo || `CH-${Math.floor(1000 + Math.random() * 9000)}`);
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = (status: PartnerSupplyOrder['status']) => {
    if (!selectedOrder) return;
    onUpdateOrderStatus(selectedOrder.id, status, challanInput);
    setDispatchModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1300px] mx-auto">
      {/* Top Banner if Admin is viewing */}
      {isAdminViewing && (
        <div className="bg-gradient-to-r from-purple-500/10 via-emerald-500/10 to-transparent border border-purple-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-800 flex items-center justify-center font-bold text-sm">
              🤝
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Partner & Supplier Portal View</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                  Simulated as: Venky\'s & Big Dutchman
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Vendor view for managing Day-Old Chicks (DOC), Feed, and Shed equipment supply indents.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchPortal && onSwitchPortal('admin')}
              className="px-3 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Back to Admin Hub</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-purple-950/20">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold text-slate-900">
                AKBS Partner & Supply Network
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                Authorized Supplier
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Venky's Hatcheries Ltd. • Big Dutchman Automation • Godrej Agrovet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'orders'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Supply Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'invoices'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Invoices & Ledger
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'catalog'
                ? 'bg-[#0b2818] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Price Catalog
          </button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Active Supply Orders</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            {pendingOrders.length} Orders
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Chicks & Feed in dispatch
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Total Billed to AKBS</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1">
            ₹ {(totalBilled / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            FY 2026-27 YTD
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Payment Settled</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-800 mt-1">
            ₹ {(settledAmount / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Transferred via NEFT/RTGS
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500">Pending AKBS Clearance</div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-purple-700 mt-1">
            ₹ {(pendingAmount / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            Due in 15 days credit
          </div>
        </div>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Procurement Orders & Indents from AKBS Farmers
            </h2>
            <span className="text-xs text-slate-500">
              Update delivery challans and transport status
            </span>
          </div>

          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {order.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                      {order.partnerName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      order.status === 'Delivered'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'Payment Settled'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'In Transit'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Date: {order.orderDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {order.itemDescription}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Destination Farm:</span>{' '}
                      <span className="font-semibold text-slate-800">{order.farmLocation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Quantity / Indent:</span>{' '}
                      <span className="font-bold text-slate-900">{order.quantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Order Invoice Value:</span>{' '}
                      <span className="font-bold font-mono text-emerald-800">
                        ₹ {order.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {order.dispatchChallanNo && (
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Challan / E-way Bill: <b>{order.dispatchChallanNo}</b></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleOpenDispatch(order)}
                    className="px-3.5 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Update Dispatch</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Partner Invoices & Payment Disbursal History
              </h2>
              <p className="text-xs text-slate-500">
                Direct bank settlement account: HDFC Bank - A/C No: 502000123984
              </p>
            </div>
            <button onClick={exportStatement} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export Statement (CSV)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice / Order #</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Farmer</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Challan Ref</th>
                  <th className="py-2.5 px-3 text-right">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.id}</td>
                    <td className="py-3 px-3">{o.itemDescription}</td>
                    <td className="py-3 px-3 text-slate-600">{o.farmerName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                      ₹ {o.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {o.dispatchChallanNo || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.status === 'Payment Settled'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status === 'Payment Settled' ? 'Paid / Settled' : 'Payment Due (15 Days)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Supplier Price Rate Card
              </h2>
              <p className="text-xs text-slate-500">
                Contractual rates supplied to AKBS Poultry network farmers
              </p>
            </div>
            <button onClick={() => setShowRateCardEditor(true)} className="px-3 py-1.5 bg-[#0b2818] text-white text-xs font-bold rounded-lg">
              Update Rate Card
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-900">Cobb 500 Broiler DOC</div>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">₹ {docRate.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Per chick (Marek & ND vaccinated)</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-900">Broiler Pre-Starter Feed</div>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">₹ {feedRate.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-slate-500 mt-1">Per 50kg bag (CP 23%, ME 3050)</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-900">Automated Feeding Line</div>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">₹ 1,700.00</div>
              <div className="text-[11px] text-slate-500 mt-1">Per meter run (Big Dutchman auger)</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update Dispatch */}
      {dispatchModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Update Supply Dispatch Status
                </h3>
              </div>
              <button onClick={() => setDispatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900">{selectedOrder.itemDescription}</div>
                <div className="text-slate-500">Destination: {selectedOrder.farmLocation}</div>
                <div className="font-mono font-bold text-emerald-800">
                  ₹ {selectedOrder.totalAmount.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Dispatch Challan / E-Way Bill Number
                </label>
                <input
                  type="text"
                  value={challanInput}
                  onChange={(e) => setChallanInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  placeholder="e.g. VK-DOC-2026-991"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirmDispatch('In Transit')}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Truck className="w-4 h-4" />
                  <span>Mark as Dispatched / In Transit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDispatch('Delivered')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Delivered at Farm Gate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDispatch('Payment Settled')}
                  className="w-full py-2 bg-[#0b2818] hover:bg-[#123e27] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Mark Payment Settled & Cleared</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRateCardEditor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowRateCardEditor(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between pb-3 border-b"><h3 className="font-bold text-slate-900">Update Partner Rate Card</h3><button onClick={() => setShowRateCardEditor(false)} className="text-xl text-slate-400">×</button></div>
            <div className="mt-4 space-y-3 text-xs">
              <label className="block"><span className="font-semibold block mb-1">DOC Rate / Chick</span><input type="number" value={docRate} onChange={e=>setDocRate(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg"/></label>
              <label className="block"><span className="font-semibold block mb-1">Feed Rate / 50kg Bag</span><input type="number" value={feedRate} onChange={e=>setFeedRate(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg"/></label>
              <label className="block"><span className="font-semibold block mb-1">Equipment Base Rate</span><input type="number" value={equipmentRate} onChange={e=>setEquipmentRate(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg"/></label>
              <div className="flex justify-end"><button onClick={() => setShowRateCardEditor(false)} className="px-4 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Save Rate Card</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
