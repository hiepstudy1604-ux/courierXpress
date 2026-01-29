
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Filter, 
  Search, 
  Calendar, 
  Hash, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ChevronDown,
  Eye,
  Pencil,
  Phone as PhoneIcon
} from 'lucide-react';
import { User, UserRole } from '../types';
import { BillingService } from '../services/api';
import { Loader2, XCircle } from 'lucide-react';

interface Props {
  user: User;
}

/* 
Khai bao bien cho component BillingManagement
 */

const BillingManagement: React.FC<Props> = ({ user }) => {
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    trackingId: '',
    billId: '',
    date: ''
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const isCustomer = user.role === UserRole.CUSTOMER;

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

  /* 
  chức năng useEffect để lấy dữ liệu hóa đơn khi bộ lọc thay đổi
  */
  useEffect(() => {
    fetchBills();
  }, [filters]);

  const fetchBills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.trackingId) params.tracking_id = filters.trackingId;
      if (filters.billId) params.bill_id = filters.billId;
      if (filters.date) params.date = filters.date;

      const response = await BillingService.getAll(params);
      
      if (response.data.success) {
        const transformedData = response.data.data.map((bill: any) => ({
          id: bill.id || bill.bill_id || `BILL-${bill.id}`,
          billId: bill.bill_id || bill.billId || bill.id,
          trackingId: bill.tracking_id || bill.trackingId || 'N/A',
          amount: bill.amount || bill.total_amount || 0,
          date: bill.date || bill.created_at || 'N/A',
          created_at: bill.created_at || bill.date || 'N/A',
          customer: bill.customer_name || bill.customer || user.name,
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

  const resetFilters = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFilters({ trackingId: '', billId: '', date: '' });
  };

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
              onClick={resetFilters}
              className="flex items-center gap-2 text-slate-400 hover:text-[#f97316] text-xs font-bold transition-all px-3 py-1.5 hover:bg-orange-50 rounded-lg group"
              title="Reset Filters"
            >
              <RotateCcw size={14} className="group-active:rotate-180 transition-transform" />
              Reset All
            </button>
          )}
        </div>
        
        {showFilters && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
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
              <label className="text-sm font-bold text-slate-700 ml-1">Creation Date</label>
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
                      <button
                        onClick={fetchBills}
                        className="px-4 py-2 bg-[#f97316] text-white rounded-lg font-bold text-sm hover:bg-[#ea580c] transition-all"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-sm font-semibold text-slate-500">No bills found</p>
                  </td>
                </tr>
              ) : (
                transactions.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage).map((tx) => (
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
                  <td className="px-6 py-5 text-right flex gap-2 justify-end items-center">
                    <button
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-all"
                      title="Xem chi tiết"
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

        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
          <p className="text-xs font-bold text-slate-500">
            Showing{' '}
            <span className="text-slate-900 font-black">
              {transactions.length > 0 ? Math.min(transactions.length, (currentPage - 1) * itemsPerPage + 1) : 0}
              -{Math.min(transactions.length, currentPage * itemsPerPage)}
            </span>{' '}
            of <span className="text-slate-900 font-black">{transactions.length}</span> bills
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              {(() => {
                const maxVisible = 7;
                const total = totalPages;
                const current = safePage;

                const pages: number[] = [];
                const pushRange = (start: number, end: number) => {
                  for (let p = start; p <= end; p++) pages.push(p);
                };

                if (total <= maxVisible) {
                  pushRange(1, total);
                } else {
                  const left = Math.max(1, current - 2);
                  const right = Math.min(total, current + 2);

                  pages.push(1);
                  if (left > 2) pages.push(-1);
                  pushRange(Math.max(2, left), Math.min(total - 1, right));
                  if (right < total - 1) pages.push(-1);
                  pages.push(total);
                }

                return pages.map((p, idx) => {
                  if (p === -1) {
                    return (
                      <span key={`ellipsis-${idx}`} className="w-9 text-center text-xs font-black text-slate-300">
                        …
                      </span>
                    );
                  }

                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${
                        current === p
                          ? 'bg-slate-900 text-white shadow-lg border-slate-900'
                          : 'bg-white text-slate-400 border-slate-200 hover:text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
            </div>
            <button
              disabled={safePage === totalPages || transactions.length === 0}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>


      {showDetailModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-w-[95vw] max-h-[80vh] border border-orange-200 overflow-y-auto scrollbar-hide pointer-events-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-10 pt-8 pb-4 border-b border-orange-100 rounded-t-2xl bg-gradient-to-r from-orange-100 to-white">
              <h2 className="text-2xl font-extrabold text-orange-600 flex items-center gap-3 tracking-tight">
                <FileText size={32} className="text-orange-400" /> Thông tin đơn hàng
              </h2>
              <button
                className="p-2 rounded-full hover:bg-orange-200 text-slate-400 hover:text-orange-600 transition-all"
                onClick={closeDetailModal}
                title="Đóng"
              >
                <XCircle size={28} />
              </button>
            </div>
            <div className="px-10 py-8 space-y-8">
              {/* Thông tin chung và hàng hóa */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Mã đơn hàng</span>
                    <span className="font-bold text-slate-900 text-base">{selectedBill.trackingId}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Mã hóa đơn</span>
                    <span className="font-bold text-orange-600 text-base">{selectedBill.id}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Ngày tạo đơn</span>
                    <span className="font-semibold text-slate-700 text-base">{selectedBill.created_at || selectedBill.date}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Ngày nhận đơn</span>
                    <span className="font-semibold text-slate-700 text-base">{selectedBill.received_at || '-'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Tên hàng hóa</span>
                    <span className="font-semibold text-slate-700 text-base">{selectedBill.goods_name || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Loại hàng hóa</span>
                    <span className="font-semibold text-slate-700 text-base">{selectedBill.goods_type || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Loại vận chuyển</span>
                    <span className="font-semibold text-slate-700 text-base">{selectedBill.shipping_type || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-semibold">Cân nặng (kg)</span>
                    <span className="font-semibold text-slate-700 text-base">{selectedBill.weight || '-'}</span>
                  </div>
                  <div className="flex flex-row gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500 font-semibold">Dài (cm)</span>
                      <span className="font-semibold text-slate-700 text-base">{selectedBill.length || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500 font-semibold">Rộng (cm)</span>
                      <span className="font-semibold text-slate-700 text-base">{selectedBill.width || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500 font-semibold">Cao (cm)</span>
                      <span className="font-semibold text-slate-700 text-base">{selectedBill.height || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Thông tin người gửi/nhận */}
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-semibold mb-1">Khách gửi</span>
                  <span className="font-bold text-slate-700 text-base">{selectedBill.sender_name || '-'}</span>
                  <span className="text-xs text-slate-400">{selectedBill.sender_phone || '-'}</span>
                  <span className="text-xs text-slate-400">{selectedBill.sender_address || '-'}</span>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-semibold mb-1">Khách nhận</span>
                  <span className="font-bold text-slate-700 text-base">{selectedBill.receiver_name || '-'}</span>
                  <span className="text-xs text-slate-400">{selectedBill.receiver_phone || '-'}</span>
                  <span className="text-xs text-slate-400">{selectedBill.receiver_address || '-'}</span>
                </div>
              </div>
              {/* Tổng tiền */}
              <div className="flex flex-col items-end mt-2">
                <div className="text-base text-slate-500 font-semibold">Tổng tiền</div>
                <div className="font-extrabold text-2xl text-green-600">${(selectedBill.amount / 25000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingManagement;
