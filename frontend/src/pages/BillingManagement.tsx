import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  Hash,
  RotateCcw,
  Search,
  User as UserIcon,
  Loader2,
  XCircle,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { BillingService } from '../services/api';

interface Props {
  user: User;
}

const BillingManagement: React.FC<Props> = ({ user }) => {
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    trackingId: '',
    billId: '',
    date: '',
    customerName: '' 
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isCustomer = user.role === UserRole.CUSTOMER;
  const canSearchCustomer = user.role === UserRole.ADMIN || user.role === UserRole.AGENT;

  // Modal state
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const openDetailModal = (bill: any) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBill(null);
  };

  useEffect(() => {
    fetchBills();
    setCurrentPage(1); 
  }, [filters]);

  const fetchBills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.trackingId) params.tracking_id = filters.trackingId;
      if (filters.billId) params.bill_id = filters.billId;
      if (filters.date) params.date = filters.date;
      if (filters.customerName) params.customer_name = filters.customerName;

      const response = await BillingService.getAll(params);
      
      if (response.data.success) {
        const transformedData = response.data.data.map((bill: any) => ({
          id: bill.id || bill.bill_id || `BILL-${bill.id}`,
          billId: bill.bill_id || bill.billId || bill.id,
          trackingId: bill.tracking_id || bill.trackingId || 'N/A',
          amount: bill.amount || bill.total_amount || 0,
          date: bill.date || bill.created_at || 'N/A',
          created_at: bill.created_at || bill.date || 'N/A',
          customer: bill.customer_name || bill.customer || 'N/A',
          ...bill 
        }));
        setTransactions(transformedData);
      } else {
        setError('Failed to load bills');
      }
    } catch (err: any) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.message || 'Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  };

  // Logic to prevent numbers and allow only letters/spaces
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Regex allows letters (including Vietnamese accents) and spaces, but removes digits
    const cleanValue = value.replace(/[0-9]/g, '');
    setFilters({ ...filters, customerName: cleanValue });
  };

  const resetFilters = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFilters({ trackingId: '', billId: '', date: '', customerName: '' });
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedData = transactions.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">Filters</span>
            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
          </div>
          
          {showFilters && (
            <button 
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 text-slate-400 hover:text-[#f97316] text-xs font-bold transition-all px-3 py-1.5 hover:bg-orange-50 rounded-lg group"
            >
              <RotateCcw size={14} className="group-active:rotate-180 transition-transform" />
              Reset All
            </button>
          )}
        </div>
        
        {showFilters && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-200">
            {/* Customer Name Search - Block Numbers, Allow Accents */}
            {canSearchCustomer && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Customer Name</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Letters only (e.g. Vũ)..." 
                    value={filters.customerName}
                    onChange={handleNameChange}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900" 
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Bill ID</label>
              <div className="relative">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="BILL-..." 
                  value={filters.billId}
                  onChange={(e) => setFilters({...filters, billId: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Tracking ID</label>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="CX-..." 
                  value={filters.trackingId}
                  onChange={(e) => setFilters({...filters, trackingId: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <input 
                  type="date" 
                  value={filters.date}
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900" 
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-tight"><div className="flex items-center gap-1.5"><Hash size={14}/>Bill ID</div></th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-tight"><div className="flex items-center gap-1.5"><UserIcon size={14}/>Customer Name</div></th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-tight"><div className="flex items-center gap-1.5"><FileText size={14}/>Tracking ID</div></th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-tight"><div className="flex items-center gap-1.5"><Calendar size={14}/>Creation Date</div></th>
                <th className="pr-8 py-5 text-xs font-bold text-slate-500 tracking-tight text-right">Total Amount</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 tracking-tight text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 size={32} className="animate-spin text-[#f97316]" />
                      <p className="text-sm font-semibold text-slate-500">Loading bills...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <XCircle size={32} className="text-rose-500" />
                      <p className="text-sm font-semibold text-slate-700">{error}</p>
                      <button onClick={fetchBills} className="px-4 py-2 bg-[#f97316] text-white rounded-lg font-bold text-sm">Retry</button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-sm font-semibold text-slate-500">No bills found matching your search.</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-slate-900 leading-none">{tx.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-600 leading-none whitespace-nowrap">
                      {isCustomer ? user.name : tx.customer}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-100/50">{tx.trackingId}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-slate-500">{tx.date}</p>
                  </td>
                  <td className="pr-8 py-5 text-right">
                    <p className="text-sm font-black text-slate-900">${(tx.amount / 25000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-all"
                      onClick={() => openDetailModal(tx)}
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
          <p className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-black">{transactions.length > 0 ? (safePage - 1) * itemsPerPage + 1 : 0}-{Math.min(transactions.length, safePage * itemsPerPage)}</span> of <span className="text-slate-900 font-black">{transactions.length}</span> bills
          </p>
          <div className="flex items-center gap-2">
            <button disabled={safePage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 bg-white"><ChevronLeft size={16} /></button>
            <span className="text-xs font-black text-slate-900 px-3">Page {safePage} of {totalPages}</span>
            <button disabled={safePage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 bg-white"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {showDetailModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white sticky top-0 z-10">
              <h2 className="text-xl font-black text-orange-600 flex items-center gap-2">
                <FileText size={24} /> Order Details
              </h2>
              <button onClick={closeDetailModal} className="p-2 hover:bg-orange-100 rounded-full text-slate-400 hover:text-orange-600 transition-all"><XCircle size={24} /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <DetailItem label="Tracking ID" value={selectedBill.trackingId} bold />
                  <DetailItem label="Internal Bill ID" value={selectedBill.id} color="text-orange-600" />
                  <DetailItem label="Creation Date" value={selectedBill.created_at} />
                </div>
                <div className="space-y-4">
                  <DetailItem label="Customer Name" value={selectedBill.customer} bold />
                  <DetailItem label="Current Status" value={selectedBill.status} uppercase color="text-emerald-600" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex flex-col items-end">
                <span className="text-sm font-bold text-slate-500">Total Amount Charged</span>
                <span className="text-3xl font-black text-emerald-600">${(selectedBill.amount / 25000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value, bold, color, uppercase }: any) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
    <span className={`text-sm ${bold ? 'font-black' : 'font-bold'} ${color || 'text-slate-900'} ${uppercase ? 'uppercase' : ''}`}>{value || '-'}</span>
  </div>
);

export default BillingManagement;
