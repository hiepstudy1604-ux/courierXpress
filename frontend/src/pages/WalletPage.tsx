
import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  CreditCard, 
  DollarSign, 
  ChevronRight,
  TrendingUp,
  X,
  Smartphone,
  Building2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { User } from '../types';

interface Props {
  user: User;
}

type Transaction = {
  id: string;
  type: 'TOPUP' | 'PAYMENT' | 'REFUND';
  amount: number;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
};

const WalletPage: React.FC<Props> = ({ user }) => {
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock Wallet Data
  const walletBalance = 1250000; // in VND or simulate USD
  const totalTopUp = 2500000;
  const totalSpent = 1250000;

  const transactions: Transaction[] = [
    { id: 'TRX-9982', type: 'PAYMENT', amount: 45000, date: '2024-03-24 10:30', status: 'COMPLETED', description: 'Shipping Fee for CX-8892' },
    { id: 'TRX-9981', type: 'TOPUP', amount: 500000, date: '2024-03-23 15:45', status: 'COMPLETED', description: 'Top up via Bank Transfer' },
    { id: 'TRX-9980', type: 'PAYMENT', amount: 120000, date: '2024-03-22 09:12', status: 'COMPLETED', description: 'Shipping Fee for CX-8871' },
    { id: 'TRX-9979', type: 'REFUND', amount: 25000, date: '2024-03-21 14:00', status: 'COMPLETED', description: 'Refund for cancelled order CX-8810' },
    { id: 'TRX-9978', type: 'PAYMENT', amount: 35000, date: '2024-03-20 18:22', status: 'FAILED', description: 'Shipping Fee for CX-8805' },
    { id: 'TRX-9977', type: 'TOPUP', amount: 1000000, date: '2024-03-19 11:30', status: 'COMPLETED', description: 'Top up via E-Wallet' },
  ];

  const handleTopUp = () => {
    if (!topUpAmount || isNaN(Number(topUpAmount))) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowTopUpModal(false);
      setTopUpAmount('');
      alert('Top up request submitted successfully! Funds will be updated after verification.');
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wallet Management</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your balance and track your logistics spending.</p>
        </div>
      </div>

      {/* Hero Balance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
          <div className="absolute right-[-5%] top-[-10%] w-[40%] aspect-square bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                  <Wallet size={24} className="text-[#f97316]" />
                </div>
                <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Available Balance</span>
              </div>
              <div className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">Secure Account</div>
            </div>

            <div>
              <div className="flex items-end gap-3 mb-2">
                <h2 className="text-6xl font-black tracking-tighter leading-none">${(walletBalance / 25000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                <span className="text-slate-400 font-bold mb-1 text-lg">USD</span>
              </div>
              <p className="text-slate-500 font-medium text-sm">Equivalent to ~ {walletBalance.toLocaleString()} VND</p>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowTopUpModal(true)}
                className="px-10 py-4 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-[20px] font-black text-sm flex items-center gap-2 shadow-lg shadow-orange-950/20 transition-all transform active:scale-95"
              >
                <Plus size={20} strokeWidth={3} /> Top Up Wallet
              </button>
              <button className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[20px] font-black text-sm flex items-center gap-2 transition-all">
                Send Funds
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-rows-2 gap-6">
          {[
            { label: 'Total Top-up', value: `$${(totalTopUp / 25000).toLocaleString()}`, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Total Spent', value: `$${(totalSpent / 25000).toLocaleString()}`, icon: ArrowDownLeft, color: 'text-[#f97316]', bg: 'bg-orange-50', border: 'border-orange-100' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white p-8 rounded-[32px] border-2 ${stat.border} shadow-sm flex flex-col justify-between group hover:scale-[1.02] transition-transform`}>
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                  <stat.icon size={24} />
                </div>
                <TrendingUp size={20} className="text-slate-200" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Section */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><History size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Audit Logs</p>
            </div>
          </div>
          <button className="text-sm font-black text-[#f97316] hover:underline flex items-center gap-2 group">
            View All History <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference ID</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-10 py-6 font-black text-slate-900 text-sm">{trx.id}</td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        trx.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 
                        trx.type === 'REFUND' ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {trx.type === 'TOPUP' ? <ArrowUpRight size={16} /> : trx.type === 'REFUND' ? <Plus size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <span className="text-sm font-bold text-slate-600">{trx.description}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-xs font-bold text-slate-400">{trx.date}</td>
                  <td className="px-10 py-6 text-center">
                    <span className={`text-sm font-black ${trx.type === 'TOPUP' || trx.type === 'REFUND' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {trx.type === 'TOPUP' || trx.type === 'REFUND' ? '+' : '-'}${ (trx.amount / 25000).toFixed(2) }
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                      trx.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      trx.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {trx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowTopUpModal(false)}></div>
          <div className="relative bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Top Up Wallet</h3>
              </div>
              <button onClick={() => setShowTopUpModal(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deposit Amount (USD)</label>
                <div className="relative">
                  <DollarSign size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500" />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full pl-14 pr-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[28px] text-3xl font-black text-slate-900 outline-none focus:bg-white focus:border-orange-500 transition-all placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'bank', label: 'Bank Transfer', icon: Building2, info: 'All Major Banks' },
                    { id: 'wallet', label: 'E-Wallet (MoMo/Zalo)', icon: Smartphone, info: 'Instant Update' }
                  ].map((method) => (
                    <div key={method.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] flex items-center justify-between cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm group-hover:text-orange-500 transition-colors"><method.icon size={24} /></div>
                        <div>
                          <p className="font-black text-slate-900">{method.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{method.info}</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={!topUpAmount || isProcessing}
                  onClick={handleTopUp}
                  className="w-full py-5 bg-[#f97316] text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-950/20 hover:bg-[#ea580c] transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> Confirm Deposit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
